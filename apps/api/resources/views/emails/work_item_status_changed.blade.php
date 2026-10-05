<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cambio de estado en tarea</title>
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
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
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
        .task-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #0284c7;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 28px;
        }
        .task-title {
            font-size: 17px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
        }
        .status-transition {
            display: flex;
            align-items: center;
            font-size: 14px;
            gap: 8px;
        }
        .badge-old {
            background: #f1f5f9;
            color: #64748b;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 600;
        }
        .badge-new {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 600;
        }
        .btn-wrapper {
            text-align: center;
            margin-bottom: 28px;
        }
        .btn {
            display: inline-block;
            background: #0284c7;
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
            <div class="header-subtitle">Actualización de Estado</div>
        </div>
        <div class="body">
            <h1 class="greeting">Actualización en {{ $projectName }}</h1>
            <p class="message">
                <strong>{{ $actor?->name ?? 'Un miembro del equipo' }}</strong> ha cambiado el estado de una tarea que sigues o tienes asignada.
            </p>
            <div class="task-card">
                <div class="task-title">{{ $workItem->name }}</div>
                <div class="status-transition">
                    <span class="badge-old">{{ $oldStateName }}</span>
                    <span>&rarr;</span>
                    <span class="badge-new">{{ $newStateName }}</span>
                </div>
            </div>
            <div class="btn-wrapper">
                <a href="{{ $workItemUrl }}" class="btn">Abrir Tarea</a>
            </div>
        </div>
        <div class="footer">
            Plane &bull; Notificación del Sistema
        </div>
    </div>
</body>
</html>
