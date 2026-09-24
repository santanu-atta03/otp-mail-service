const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      authHeader !== `Bearer ${process.env.MAIL_SERVICE_SECRET}`
    ) {
      return res.status(401).json({
        success: false,
        message: "unauthorized",
      });
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and otp both required!",
      });
    }

    const senderEmail = process.env.MAIL_USERNAME;

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.MAIL_PORT) || 587,
      secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for 587
      auth: {
        user: senderEmail,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification</title>
    </head>
    <body style="margin:0; padding:30px 10px; background-color:#0c0c0f; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f8fafc;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px; background-color:#17161b; border:1px solid #27262f; border-radius:16px; padding:32px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
        <tr>
          <td align="center" style="padding-bottom:24px; border-bottom:1px solid #27262f;">
            <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#ffffff;">
              NegoMind <span style="color:#10b981; font-weight:800;">AI</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 0;">
            <div style="font-size:16px; color:#cbd5e1; margin-bottom:12px;">
              Hello,
            </div>
            <p style="font-size:13px; color:#94a3b8; line-height:1.5; margin:0 0 20px 0;">
              Use the 6-digit verification code below to complete your registration or sign-in.
            </p>
            
            <!-- OTP Box -->
            <div style="background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05)); border:1px solid rgba(16,185,129,0.3); border-radius:16px; padding:24px; margin:20px 0; text-align:center;">
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#10b981; letter-spacing:1px; margin-bottom:6px;">
                Your Verification Code
              </div>
              <div style="font-family:'Courier New', Courier, monospace; font-size:38px; font-weight:900; letter-spacing:10px; color:#10b981; margin:8px 0;">
                ${otp}
              </div>
              <div style="font-size:11px; color:#94a3b8;">Valid for 10 minutes</div>
            </div>

            <p style="font-size:12px; color:#64748b; margin-top:20px;">
              If you did not request this verification code, please ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="border-top:1px solid #27262f; padding-top:20px; font-size:11px; color:#64748b;">
            &copy; NegoMind AI Platform &bull; Multi-Agent Negotiation System
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: `"NegoMind AI Verification" <${senderEmail}>`,
      to: email,
      subject: `${otp} is your NegoMind AI Verification Code`,
      text: `Your NegoMind AI OTP is ${otp}. It will expire in 10 minutes.`,
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      message: "Otp email sent",
    });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};
