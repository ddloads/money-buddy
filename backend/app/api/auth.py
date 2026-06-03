from __future__ import annotations

import logging
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Google OAuth client ───────────────────────────────────────────────────────
oauth = OAuth()
if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def _get_user_by_google_id(db: AsyncSession, google_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    """Register a new user with email and password."""
    existing = await _get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    logger.info("New user registered: %s (id=%s)", user.email, user.id)
    return user


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Authenticate with email + password and receive a JWT."""
    user = await _get_user_by_email(db, payload.email)
    if user is None or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    token = create_access_token(subject=user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/google")
async def google_login(request: Request):
    """Initiate the Google OAuth2 flow. Redirects to Google's consent screen."""
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured",
        )
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle the Google OAuth2 callback."""
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured",
        )
    try:
        google_token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        logger.error("Google OAuth error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google",
        )

    user_info = google_token.get("userinfo") or {}
    google_id: str = user_info.get("sub", "")
    email: str = user_info.get("email", "")
    name: str = user_info.get("name", "")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return required user information",
        )

    # Find or create user
    user = await _get_user_by_google_id(db, google_id)
    if user is None:
        user = await _get_user_by_email(db, email)
        if user:
            # Link Google to existing email account
            user.google_id = google_id
        else:
            user = User(email=email, username=name or email.split("@")[0], google_id=google_id)
            db.add(user)
            await db.flush()
            await db.refresh(user)
            logger.info("New Google user created: %s (id=%s)", user.email, user.id)

    token = create_access_token(subject=user.id)
    # Redirect the browser back to the frontend SPA with the token as a query param.
    # The frontend reads it from the URL, stores it in Zustand, then removes it from history.
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")


@router.get("/me", response_model=UserRead)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    """Return the currently authenticated user's profile (requires JWT)."""
    from app.api.deps import get_current_user
    from app.core.security import oauth2_scheme

    # Manual token extraction to avoid circular dependency on router level
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ", 1)[1]
    from app.core.security import decode_access_token

    payload = decode_access_token(token)
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
