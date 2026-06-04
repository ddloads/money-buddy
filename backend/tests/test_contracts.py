from app.core.security import hash_password, verify_password
from app.main import app
from app.schemas.auth import Token
from app.schemas.user import UserRead


def test_hash_password_accepts_normal_password():
    password = "TestPassword123!"

    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)


def test_dashboard_split_endpoints_exist_for_frontend_contract():
    paths = {route.path for route in app.routes}

    assert "/dashboard/summary" in paths
    assert "/dashboard/upcoming" in paths
    assert "/dashboard/monthly" in paths


def test_token_response_contains_user_for_frontend_auth_store():
    fields = set(Token.model_fields)

    assert {"access_token", "token_type", "user"}.issubset(fields)
    assert Token.model_fields["user"].annotation is UserRead
