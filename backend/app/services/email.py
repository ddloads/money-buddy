from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_reminder_html(recipient_name: str, bill_name: str, amount: float, due_date: str) -> str:
    """Build the HTML body for a bill reminder email."""
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
    .card {{ background: #fff; border-radius: 8px; padding: 30px; max-width: 500px; margin: auto; }}
    .amount {{ font-size: 28px; font-weight: bold; color: #e74c3c; }}
    .footer {{ margin-top: 20px; font-size: 12px; color: #888; }}
  </style>
</head>
<body>
  <div class="card">
    <h2>💸 Bill Reminder from Money Buddy</h2>
    <p>Hi <strong>{recipient_name}</strong>,</p>
    <p>This is a friendly reminder that the following bill is coming up soon:</p>
    <table>
      <tr><td><strong>Bill:</strong></td><td>{bill_name}</td></tr>
      <tr><td><strong>Amount:</strong></td><td class="amount">${amount:,.2f}</td></tr>
      <tr><td><strong>Due Date:</strong></td><td>{due_date}</td></tr>
    </table>
    <p>Please ensure you have sufficient funds and pay on time to avoid late fees.</p>
    <p>You can manage your bills at <a href="#">Money Buddy</a>.</p>
    <div class="footer">You received this email because you have bill reminders enabled in Money Buddy.</div>
  </div>
</body>
</html>
"""


def send_reminder_email(
    recipient_email: str,
    recipient_name: str,
    bill_name: str,
    amount: float,
    due_date: str,
    subject: Optional[str] = None,
) -> bool:
    """
    Send a bill reminder email via SMTP.

    Args:
        recipient_email: The user's email address.
        recipient_name:  The user's display name.
        bill_name:       The bill title.
        amount:          Bill amount in dollars.
        due_date:        Human-readable due date string.
        subject:         Optional custom subject line.

    Returns:
        True if sent successfully, False otherwise.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — skipping reminder email to %s", recipient_email)
        return False

    subject = subject or f"⏰ Reminder: '{bill_name}' is due on {due_date}"
    html_body = _build_reminder_html(recipient_name, bill_name, amount, due_date)
    text_body = (
        f"Reminder: Your bill '{bill_name}' of ${amount:,.2f} is due on {due_date}. "
        "Please log in to Money Buddy to pay or manage it."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_TLS:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [recipient_email], msg.as_string())
        logger.info("Reminder email sent to %s for bill '%s'", recipient_email, bill_name)
        return True
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", recipient_email, exc)
        return False
    except OSError as exc:
        logger.error("Network error sending email to %s: %s", recipient_email, exc)
        return False
