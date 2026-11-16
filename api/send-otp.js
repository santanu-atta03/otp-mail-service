
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Each project has its own SMTP account and private token.
const projects = {
  [process.env.MAIL_SERVICE_SECRET]: {
    username: process.env.INTERVYO_MAIL_USERNAME,
    password: process.env.INTERVYO_MAIL_PASSWORD,
    fromName: "Intervyo",
    appName : "Intervyo",
    logoUrl: process.env.INTERVYO_LOGO_URL,
  },

  [process.env.PROJECT2_SERVICE_TOKEN]: {
    username: process.env.PROJECT2_MAIL_USERNAME,
    password: process.env.PROJECT2_MAIL_PASSWORD,
    fromName: "Project 2",
  },

  [process.env.PROJECT3_SERVICE_TOKEN]: {
    username: process.env.PROJECT3_MAIL_USERNAME,
    password: process.env.PROJECT3_MAIL_PASSWORD,
    fromName: "Project 3",
  },
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function createBrandedEmail({
  appName,
  logoUrl,
  content,
}) {
  const safeAppName = escapeHtml(appName);

  // Only allow HTTPS logo URLs.
  let safeLogoUrl = "";

  try {
    const parsedUrl = new URL(logoUrl);

    if (parsedUrl.protocol === "https:") {
      safeLogoUrl = escapeHtml(parsedUrl.href);
    }
  } catch {
    // Continue without a logo if URL is invalid.
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="
  margin: 0;
  padding: 40px 15px;
  background-color: #f5f5f5;
  font-family: Arial, Helvetica, sans-serif;
">

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            max-width: 480px;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
          "
        >

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 35px 25px 20px;">

              ${
                safeLogoUrl
                  ? `
                    <img
                      src="${safeLogoUrl}"
                      alt="${safeAppName}"
                      width="150"
                      style="
                        display: block;
                        width: 150px;
                        max-width: 100%;
                        height: auto;
                        border: 0;
                      "
                    />
                  `
                  : `
                    <h2 style="
                      margin: 0;
                      color: #18181b;
                      font-size: 22px;
                    ">
                      ${safeAppName}
                    </h2>
                  `
              }

            </td>
          </tr>

          <!-- Email Content -->
          <tr>
            <td style="
              padding: 15px 32px 35px;
              color: #27272a;
              font-size: 14px;
              line-height: 1.7;
            ">

              ${content}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="
              padding: 20px;
              background: #fafafa;
              border-top: 1px solid #eeeeee;
              color: #888888;
              font-size: 11px;
              line-height: 1.6;
            ">

              This is an automated email from
              ${safeAppName}.

              <br />

              If you did not request this email,
              you can safely ignore it.

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // 1. Identify the project using its private token.
    const authHeader = req.headers.authorization || "";
    const suppliedToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!suppliedToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Prevent missing environment variables from matching.
    const project = Object.entries(projects).find(
      ([token, config]) =>
        token &&
        config.username &&
        config.password &&
        Buffer.byteLength(token) === Buffer.byteLength(suppliedToken) &&
        crypto.timingSafeEqual(
          Buffer.from(token),
          Buffer.from(suppliedToken)
        )
    )?.[1];

    if (!project) {
      return res.status(401).json({
        success: false,
        message: "Invalid project credentials",
      });
    }

    // 2. Get email content.
    const {
      to,
      subject,
      text,
      html,
    } = req.body || {};

    // 3. Validate request.
    if (
      typeof to !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid recipient email is required",
      });
    }

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid email subject is required",
      });
    }

    if (
      (typeof text !== "string" || !text.trim()) &&
      (typeof html !== "string" || !html.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Email text or HTML content is required",
      });
    }

    // 4. Configure the selected project's SMTP account.
    const port = Number(process.env.MAIL_PORT || 587);

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: {
        user: project.username,
        pass: project.password,
      },
    });

    // 5. Send email using the selected project's Gmail.
    const emailContent = createBrandedEmail({
  appName: project.appName,
  logoUrl: project.logoUrl,
  content: html || `<p>${escapeHtml(text)}</p>`,
});

const info = await transporter.sendMail({
  from: {
    name: project.fromName,
    address: project.username,
  },
  to: to.trim(),
  subject: subject.trim(),
  text: text || undefined,
  html: emailContent,
});

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    });

  } catch (error) {
    console.error("EMAIL SERVICE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
};
