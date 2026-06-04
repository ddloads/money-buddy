from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_reminder_html(
    recipient_name: str, bill_name: str, amount: float, due_date: str, overdue: bool = False
) -> str:
    """Build the HTML body for a bill reminder or overdue alert email."""
    if overdue:
        headline = "🚨 Overdue Bill — Action Required"
        intro = "The following bill is <strong>past due</strong> and still unpaid:"
        cta = "Please log in to Money Buddy to pay or update this bill."
        accent = "#e74c3c"
    else:
        headline = "💸 Bill Reminder from Money Buddy"
        intro = "This is a friendly reminder that the following bill is coming up soon:"
        cta = "Please ensure you have sufficient funds and pay on time to avoid late fees."
        accent = "#10b981"

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
    .card {{ background: #fff; border-radius: 8px; padding: 30px; max-width: 500px; margin: auto; }}
    .amount {{ font-size: 28px; font-weight: bold; color: {accent}; }}
    .footer {{ margin-top: 20px; font-size: 12px; color: #888; }}
  </style>
</head>
<body>
  <div class="card">
    <h2>{headline}</h2>
    <p>Hi <strong>{recipient_name}</strong>,</p>
    <p>{intro}</p>
    <table>
      <tr><td><strong>Bill:</strong></td><td>{bill_name}</td></tr>
      <tr><td><strong>Amount:</strong></td><td class="amount">${amount:,.2f}</td></tr>
      <tr><td><strong>Due Date:</strong></td><td>{due_date}</td></tr>
    </table>
    <p>{cta}</p>
    <p>You can manage your bills at <a href="#">Money Buddy</a>.</p>
    <div class="footer">You received this email because you have notifications enabled in Money Buddy.</div>
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
    overdue: bool = False,
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
    smtp_host = settings.SMTP_HOST.strip()
    if not smtp_host:
        logger.warning("SMTP host not configured — skipping reminder email to %s", recipient_email)
        return False

    smtp_user = settings.SMTP_USER.strip()
    smtp_password = settings.SMTP_PASSWORD

    if overdue:
        subject = subject or f"🚨 Overdue: '{bill_name}' was due on {due_date}"
    else:
        subject = subject or f"⏰ Reminder: '{bill_name}' is due on {due_date}"
    html_body = _build_reminder_html(recipient_name, bill_name, amount, due_date, overdue=overdue)
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
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_TLS:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(msg["From"], [recipient_email], msg.as_string())
        logger.info("Reminder email sent to %s for bill '%s'", recipient_email, bill_name)
        return True
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", recipient_email, exc)
        return False
    except OSError as exc:
        logger.error("Network error sending email to %s: %s", recipient_email, exc)
        return False
