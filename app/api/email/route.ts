import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Received email request:", {
      to: body.to,
      subject: body.subject,
      inquiryId: body.inquiryId,
    });

    const required = [
      "to",
      "subject",
      "message",
      "adminName",
      "clientName",
      "inquiryId",
    ];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("Email configuration missing");
      return NextResponse.json(
        {
          success: false,
          error:
            "Email service is not configured. Please contact the administrator.",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },

      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Response to Your Inquiry</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .email-header {
            background-color: #dc2626;
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .email-content {
            padding: 30px;
          }
          .response-box {
            background-color: #f9fafb;
            border-left: 4px solid #dc2626;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .original-message {
            background-color: #f3f4f6;
            padding: 15px;
            border-left: 3px solid #9ca3af;
            margin: 15px 0;
            font-style: italic;
            color: #6b7280;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h2>Alia Jan Delgado Law Office</h2>
           
          </div>
          
          <div class="email-content">
            <h3>Dear ${escapeHtml(body.clientName)},</h3>
            
            <p>Thank you for contacting us regarding: <strong>${escapeHtml(
              body.subject.replace("Re: ", "")
            )}</strong></p>
            
            <div class="response-box">
              <p><strong>Our Response:</strong></p>
              <p>${escapeHtml(body.message).replace(/\n/g, "<br>")}</p>
            </div>
            
            ${
              body.originalMessage
                ? `
            <p>This is in response to your original message:</p>
            <div class="original-message">
              ${escapeHtml(body.originalMessage).replace(/\n/g, "<br>")}
            </div>
            `
                : ""
            }
            
            <div class="signature">
              <p><strong>Best regards,</strong><br>
              ${escapeHtml(body.adminName)}<br>
              <em>Alia Jan Delgado Law Office</em></p>
              
              <p>
                Phone: ${process.env.FIRM_PHONE || "+63 (XXX) XXX-XXXX"}<br>
                Email: ${
                  process.env.CONTACT_EMAIL || "contact@lawdelgado.com"
                }<br>
                Address: ${
                  process.env.FIRM_ADDRESS ||
                  "123 Legal Avenue, Makati City, Philippines 1200"
                }
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated response to your inquiry. Please do not reply directly to this email.</p>
            <p>If you have further questions, please contact us through our website or call our office directly.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Dear ${body.clientName},

Thank you for contacting us regarding: ${body.subject.replace("Re: ", "")}

Our Response:
${body.message}

${
  body.originalMessage
    ? `This is in response to your original message:
"${body.originalMessage}"\n\n`
    : ""
}
Best regards,
${body.adminName}
Alia Jan Delgado Law Office

Phone: ${process.env.FIRM_PHONE || "+63 (XXX) XXX-XXXX"}
Email: ${process.env.CONTACT_EMAIL || "contact@lawdelgado.com"}
Address: ${
      process.env.FIRM_ADDRESS ||
      "123 Legal Avenue, Makati City, Philippines 1200"
    }

---
This is an automated response to your inquiry. Please do not reply directly to this email.`;

    const info = await transporter.sendMail({
      from: `"${body.adminName}" <${
        process.env.FROM_EMAIL || process.env.SMTP_USER
      }>`,
      to: body.to,
      subject: body.subject,
      html: htmlContent,
      text: textContent,
    });

    console.log("Email sent successfully:", info.messageId);

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send email",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export async function GET() {
  return NextResponse.json({
    message: "Email API is running",
    status: "OK",
    timestamp: new Date().toISOString(),
    configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  });
}
