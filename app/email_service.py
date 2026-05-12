import sendgrid
from sendgrid.helpers.mail import Mail
from .config import settings


def send_password_reset_email(to_email: str, username: str, token: str) -> bool:
    if not settings.SENDGRID_API_KEY:
        print(f"[DEV] Password reset link: {settings.APP_URL}/reset-password?token={token}")
        return True

    reset_url = f"{settings.APP_URL}/reset-password?token={token}"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Recuperá tu contraseña — Mundial 2026 Tracker</h2>
        <p>Hola <strong>{username}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>
            <a href="{reset_url}"
               style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
                Restablecer contraseña
            </a>
        </p>
        <p>Este link expira en 1 hora.</p>
        <p>Si no solicitaste este cambio, ignorá este email.</p>
    </div>
    """

    message = Mail(
        from_email=settings.FROM_EMAIL,
        to_emails=to_email,
        subject="Recuperá tu contraseña — Mundial 2026 Tracker",
        html_content=html_content,
    )

    try:
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code in (200, 201, 202)
    except Exception as e:
        print(f"SendGrid error: {e}")
        return False