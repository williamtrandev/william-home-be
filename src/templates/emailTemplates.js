const getInviteEmailTemplate = (houseName, inviteLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>William's Home Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #4a90e2;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 30px;
            color: #333;
        }
        .button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: linear-gradient(to right, #2563eb, #9333ea);
            color: white !important;
            text-decoration: none;
            border-radius: 12px;
            margin: 20px 0;
            font-weight: 500;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .button:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        .button svg {
            width: 20px;
            height: 20px;
            pointer-events: none;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .language {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .language:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">William's Home</div>
            <h2>You've Been Invited! / Bạn Đã Được Mời!</h2>
        </div>
        <div class="content">
            <!-- English Version -->
            <div class="language">
                <h3>Join ${houseName}</h3>
                <p>You've been invited to join a house. This is your opportunity to collaborate and manage expenses with your housemates.</p>
                <p>Click the button below to accept the invitation and get started:</p>
                <div style="text-align: center;">
                    <a href="${inviteLink}" class="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <line x1="19" x2="19" y1="8" y2="14"></line>
                            <line x1="22" x2="16" y1="11" y2="11"></line>
                        </svg>
                        Join House
                    </a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${inviteLink}</p>
            </div>

            <!-- Vietnamese Version -->
            <div class="language">
                <h3>Tham Gia ${houseName}</h3>
                <p>Bạn đã được mời tham gia vào nhà. Đây là cơ hội để bạn cộng tác và quản lý chi tiêu với các thành viên trong nhà.</p>
                <p>Nhấp vào nút bên dưới để chấp nhận lời mời và bắt đầu:</p>
                <div style="text-align: center;">
                    <a href="${inviteLink}" class="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <line x1="19" x2="19" y1="8" y2="14"></line>
                            <line x1="22" x2="16" y1="11" y2="11"></line>
                        </svg>
                        Tham Gia Nhà
                    </a>
                </div>
                <p>Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết này vào trình duyệt:</p>
                <p style="word-break: break-all; color: #666;">${inviteLink}</p>
            </div>
        </div>
        <div class="footer">
            <p>This invitation was sent from William's Home</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p>Lời mời này được gửi từ William's Home</p>
            <p>Nếu bạn không mong đợi lời mời này, bạn có thể bỏ qua email này một cách an toàn.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    getInviteEmailTemplate,
};
