<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nuevo comentario en tarea</title>
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
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
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
        .comment-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #6366f1;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 28px;
        }
        .task-ref {
            font-size: 13px;
            font-weight: 600;
            color: #6366f1;
            margin-bottom: 8px;
        }
        .comment-content {
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
            background: #6366f1;
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
            <div class="header-subtitle">Nuevo Comentario</div>
        </div>
        <div class="body">
            <h1 class="greeting">Nuevo comentario</h1>
            <p class="message">
                <strong>{{ $author->name }}</strong> ha comentado en una tarea en <strong>«{{ $projectName }}»</strong>:
            </p>
            <div class="comment-card">
                <div class="task-ref">{{ $workItem->name }}</div>
                <div class="comment-content">
                    "{{ Str::limit(strip_tags($comment->comment), 200) }}"
                </div>
            </div>
            <div class="btn-wrapper">
                <a href="{{ $workItemUrl }}" class="btn">Responder al Comentario</a>
            </div>
        </div>
        <div class="footer">
            Plane &bull; Notificación del Sistema
        </div>
    </div>
</body>
</html>
