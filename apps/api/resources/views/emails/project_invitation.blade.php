<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invitación al proyecto</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f1f5f9;
            color: #334155;
            padding: 40px 16px;
        }
        .container {
            max-width: 540px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 36px 40px;
            text-align: center;
        }
        .header-logo {
            font-size: 26px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
        }
        .header-subtitle {
            color: rgba(255,255,255,0.75);
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
            margin-bottom: 28px;
        }
        .project-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #4f46e5;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 28px;
        }
        .project-name {
            font-size: 17px;
            font-weight: 700;
            color: #0f172a;
        }
        .project-role {
            display: inline-block;
            margin-top: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            background: #ede9fe;
            color: #5b21b6;
            padding: 3px 10px;
            border-radius: 99px;
        }
        .cta-wrapper {
            text-align: center;
            margin-bottom: 28px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff !important;
            text-decoration: none;
            font-size: 15px;
            font-weight: 700;
            padding: 14px 36px;
            border-radius: 8px;
            letter-spacing: 0.2px;
        }
        .expiry-note {
            font-size: 12px;
            color: #94a3b8;
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
            <p class="greeting">¡Tienes una invitación!</p>

            <p class="message">
                <strong>{{ $inviterName }}</strong> te ha invitado a colaborar en el siguiente proyecto:
            </p>

            <div class="project-card">
                <div class="project-name">{{ $projectName }}</div>
                <span class="project-role">{{ $role }}</span>
            </div>

            <div class="cta-wrapper">
                <a href="{{ $inviteUrl }}" class="cta-button">Aceptar invitación</a>
            </div>

            @if($expiresAt)
            <p class="expiry-note">Esta invitación expira el {{ $expiresAt }}.</p>
            @endif

            <hr class="divider" />

            <p class="link-fallback">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                <a href="{{ $inviteUrl }}">{{ $inviteUrl }}</a>
            </p>
        </div>

        <div class="footer">
            Has recibido este correo porque alguien usó tu dirección de email para una invitación en Plane.<br />
            Si no esperabas esta invitación, puedes ignorar este mensaje.
        </div>
    </div>
</body>
</html>
