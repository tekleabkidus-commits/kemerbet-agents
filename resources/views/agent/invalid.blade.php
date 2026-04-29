<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Link Not Valid · Kemerbet</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root{
            --bg:#1a2b4a;
            --gold:#f5c518;
            --gold-light:#ffd93d;
            --text:#ffffff;
            --text-muted:#8a98ac;
            --text-dim:#5d6b80;
            --card-bg:rgba(255,255,255,0.04);
            --card-border:rgba(255,255,255,0.08);
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{
            background:var(--bg);
            background-image:
                radial-gradient(ellipse at top,rgba(0,168,107,0.12) 0%,transparent 60%),
                radial-gradient(ellipse at bottom,rgba(245,197,24,0.06) 0%,transparent 60%);
            color:var(--text);
            font-family:'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
            min-height:100vh;
            -webkit-font-smoothing:antialiased;
        }
        .wrap{
            max-width:480px;
            margin:0 auto;
            padding:24px 18px 40px;
            min-height:100vh;
            display:flex;
            flex-direction:column;
        }
        .topbar{
            display:flex;
            align-items:center;
            margin-bottom:24px;
        }
        .brand{
            display:flex;
            align-items:center;
            gap:10px;
            font-size:.8rem;
            font-weight:700;
            color:var(--gold);
            letter-spacing:1px;
            text-transform:uppercase;
        }
        .brand-dot{
            width:8px;height:8px;
            background:var(--gold);
            border-radius:50%;
            box-shadow:0 0 10px var(--gold);
        }
        .error-card{
            flex:1;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:40px 20px;
        }
        .error-icon{
            width:56px;height:56px;
            border-radius:50%;
            background:rgba(245,197,24,0.12);
            border:1.5px solid rgba(245,197,24,0.25);
            display:flex;align-items:center;justify-content:center;
            font-size:1.5rem;
            margin-bottom:20px;
        }
        .error-card h1{
            font-size:1.4rem;
            font-weight:800;
            margin-bottom:8px;
            letter-spacing:-.3px;
        }
        .error-card p{
            font-size:.9rem;
            color:var(--text-muted);
            line-height:1.6;
            max-width:320px;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="topbar">
            <div class="brand">
                <span class="brand-dot"></span>
                Kemerbet · Agent Portal
            </div>
        </div>
        <div class="error-card">
            <div class="error-icon">⚠</div>
            <h1>Link not valid</h1>
            <p>This link doesn't exist or has been revoked. Please contact admin for a new link.</p>
        </div>
    </div>
</body>
</html>
