<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Te han mencionado en Plane</title>
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
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
        .mention-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #8b5cf6;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 28px;
        }
        .context-title {
            font-size: 14px;
            font-weight: 600;
            color: #8b5cf6;
            margin-bottom: 8px;
        }
        .mention-content {
            font-size: 15px;
            color: #1e293b;
            line-height: 1.6;
            font-style: italic;
        }
        .btn-wrapper {
            text-align: center;
            margin-bottom: 28px;
        }
        .btn {
            display: inline-block;
            background: #8b5cf6;
            color: #ffffff !important;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
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
            <div class="header-logo">PLANE</div>
            <div class="header-subtitle">Mención en Actividad</div>
        </div>
        <div class="body">
            <h1 class="greeting">¡Hola, {{ $recipient->name }}!</h1>
            <p class="message">
                <strong>{{ $actor->name }}</strong> te ha mencionado con <strong>@</strong> en:
            </p>
            <div class="mention-card">
                <div class="context-title">{{ $contextTitle }}</div>
                <div class="mention-content">
                    "{{ Str::limit(strip_tags($contentSnippet), 250) }}"
                </div>
            </div>
            <div class="btn-wrapper">
                <a href="{{ $targetUrl }}" class="btn">Ver Conversación</a>
            </div>
        </div>
        <div class="footer">
            Plane &bull; Notificación del Sistema
        </div>
    </div>
</body>
</html>
