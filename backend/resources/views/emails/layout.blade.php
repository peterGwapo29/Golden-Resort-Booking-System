<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Golden Resort Notification' }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f6f5f1;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #2b2b2b;
            line-height: 1.6;
        }
        .wrapper {
            width: 100%;
            background-color: #f6f5f1;
            padding: 30px 15px;
            box-sizing: border-box;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            border: 1px solid #e9e5dc;
        }
        .header {
            background-color: #13382c;
            padding: 28px 24px;
            text-align: center;
            border-bottom: 3px solid #c6a66b;
        }
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .header p {
            margin: 4px 0 0 0;
            color: #c6a66b;
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .content {
            padding: 32px 28px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #13382c;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }
        .badge-success {
            background-color: #e6f4ea;
            color: #137333;
        }
        .badge-warning {
            background-color: #fef7e0;
            color: #b06000;
        }
        .badge-info {
            background-color: #e8f0fe;
            color: #1a73e8;
        }
        .badge-danger {
            background-color: #fce8e6;
            color: #c5221f;
        }
        .card {
            background-color: #fdfbf7;
            border: 1px solid #e5dfd2;
            border-radius: 8px;
            padding: 18px 20px;
            margin: 20px 0;
        }
        .data-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #e5dfd2;
            font-size: 14px;
        }
        .data-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .data-label {
            color: #666666;
            font-weight: 500;
        }
        .data-value {
            color: #13382c;
            font-weight: 600;
            text-align: right;
        }
        .highlight-value {
            font-size: 18px;
            color: #13382c;
            font-weight: 700;
        }
        .footer {
            background-color: #fbf9f4;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #eeebe3;
            font-size: 12px;
            color: #8c827a;
            line-height: 1.5;
        }
        .footer a {
            color: #13382c;
            text-decoration: underline;
        }
        .btn {
            display: inline-block;
            background-color: #13382c;
            color: #c6a66b !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 15px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Golden Resort</h1>
                <p>Tropical Sanctuary & Hospitality</p>
            </div>
            <div class="content">
                @yield('content')
            </div>
            <div class="footer">
                <p><strong>Golden Resort & Spa</strong><br>Brgy. San Jose, Puerto Galera, Oriental Mindoro, Philippines</p>
                <p>Need assistance? Contact our Front Desk at <a href="mailto:support@goldenresort.com">support@goldenresort.com</a> or +63 (2) 8123-4567.</p>
                <p style="margin-top: 10px; font-size: 11px; color: #a49e97;">This is an automated operational notification regarding your booking with Golden Resort.</p>
            </div>
        </div>
    </div>
</body>
</html>
