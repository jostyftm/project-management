<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Restablecer contraseña</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            padding: 40px 16px;
        }
        .container {
            max-width: 540px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 32px 36px;
            text-align: center;
        }
        .header-logo {
            font-size: 26px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
        }
        .header-subtitle {
            color: rgba(255,255,255,0.8);
            font-size: 13px;
            margin-top: 4px;
        }
        .body {
            padding: 36px 40px;
        }
        .greeting {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
        }
        .message {
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 24px;
        }
        .warning-box {
            background: #fef3c7;
            border: 1px solid #fde68a;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 24px;
            font-size: 13px;
            line-height: 1.5;
            color: #92400e;
        }
        .cta-wrapper {
            text-align: center;
            margin: 32px 0;
        }
        .cta-button {
            display: inline-block;
            background: #4f46e5;
            color: #ffffff !important;
            text-decoration: none;
            font-size: 15px;
            font-weight: 600;
            padding: 14px 32px;
            border-radius: 8px;
            letter-spacing: 0.2px;
        }
        .expiry-note {
            font-size: 13px;
            color: #64748b;
            text-align: center;
            margin-bottom: 20px;
        }
        .divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 24px 0;
        }
        .link-fallback {
            font-size: 12px;
            color: #94a3b8;
            word-break: break-all;
            line-height: 1.5;
        }
        .link-fallback a {
            color: #4f46e5;
        }
        .footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 20px 40px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">✈ Plane</div>
            <div class="header-subtitle">Gestión de proyectos colaborativa</div>
        </div>

        <div class="body">
            <p class="greeting">Hola, {{ $userName }}</p>

            <p class="message">
                Hemos recibido una solicitud para restablecer la contraseña de acceso asociada a tu cuenta.
            </p>

            <div class="warning-box">
                ⏱ <strong>Enlace temporal seguro:</strong> Por motivos de seguridad, este enlace tiene una vigencia estricta de <strong>{{ $expiresInMinutes }} minutos</strong> y quedará invalidado tras su primer uso.
            </div>

            <div class="cta-wrapper">
                <a href="{{ $resetUrl }}" class="cta-button">Restablecer mi contraseña</a>
            </div>

            <p class="expiry-note">
                Si no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual no sufrirá ningún cambio.
            </p>

            <hr class="divider" />

            <p class="link-fallback">
                Si tienes problemas con el botón, copia y pega el siguiente enlace directamente en tu navegador web:<br />
                <a href="{{ $resetUrl }}">{{ $resetUrl }}</a>
            </p>
        </div>

        <div class="footer">
            Este es un correo automático enviado por Plane.<br />
            Por favor, no respondas a este mensaje.
        </div>
    </div>
</body>
</html>
