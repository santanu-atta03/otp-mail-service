const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // ==========================================
    // 1. Check authentication
    // ==========================================

    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      authHeader !== `Bearer ${process.env.MAIL_SERVICE_SECRET}`
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ==========================================
    // 2. Get email data from request
    // ==========================================

    const {
      to,
      subject,
      text,
      html,
      fromName = "NegoMind AI",
    } = req.body;

    // ==========================================
    // 3. Validate request
    // ==========================================

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required",
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Email subject is required",
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        success: false,
        message: "Either text or html content is required",
      });
    }

    // ==========================================
    // 4. SMTP configuration
    // ==========================================

    const senderEmail = process.env.MAIL_USERNAME;

    if (!senderEmail) {
      throw new Error("MAIL_USERNAME is not configured");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.gmail.com",

      port: Number(process.env.MAIL_PORT) || 587,

      secure: Number(process.env.MAIL_PORT) === 465,

      auth: {
        user: senderEmail,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    // ==========================================
    // 5. Send email
    // ==========================================

    const info = await transporter.sendMail({
      from: `"${fromName}" <${senderEmail}>`,

      to: to,

      subject: subject,

      text: text || undefined,

      html: html || undefined,
    });

    // ==========================================
    // 6. Return success
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    });

  } catch (error) {
    // Log detailed error on server
    console.error("EMAIL ERROR:", error);

    // Don't expose SMTP details to caller
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
};
