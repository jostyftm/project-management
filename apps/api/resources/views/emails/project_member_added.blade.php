<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Has sido añadido a un proyecto</title>
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
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
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
            color: rgba(255,255,255,0.85);
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
        .project-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #059669;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 28px;
        }
        .project-name {
            font-size: 17px;
            font-weight: 700;
            color: #0f172a;
        }
        .project-meta {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
        }
        .project-role {
            display: inline-block;
            margin-top: 8px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            background: #d1fae5;
            color: #065f46;
            padding: 3px 10px;
            border-radius: 99px;
        }
        .cta-wrapper {
            text-align: center;
            margin-bottom: 28px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
            color: #ffffff !important;
            text-decoration: none;
            font-size: 15px;
            font-weight: 700;
            padding: 14px 36px;
            border-radius: 8px;
            letter-spacing: 0.2px;
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
            color: #059669;
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
            <p class="greeting">¡Hola, {{ $userName }}!</p>

            <p class="message">
                <strong>{{ $inviterName }}</strong> te ha añadido al equipo de trabajo en Plane. Ya tienes acceso directo para comenzar a colaborar.
            </p>

            <div class="project-card">
                <div class="project-name">{{ $projectName }}</div>
                <div class="project-meta">Espacio de trabajo: <strong>{{ $workspaceName }}</strong></div>
                <span class="project-role">{{ $role }}</span>
            </div>

            <div class="cta-wrapper">
                <a href="{{ $projectUrl }}" class="cta-button">Ir al Proyecto</a>
            </div>

            <hr class="divider" />

            <p class="link-fallback">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                <a href="{{ $projectUrl }}">{{ $projectUrl }}</a>
            </p>
        </div>

        <div class="footer">
            Has recibido esta notificación porque eres miembro registrado en Plane.<br />
            Puedes gestionar tus notificaciones desde la configuración de tu cuenta.
        </div>
    </div>
</body>
</html>
