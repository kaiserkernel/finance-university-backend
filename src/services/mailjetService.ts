const dotenv = require("dotenv");
const mailjet = require("node-mailjet");
const fs = require("fs");
const path = require("path");

dotenv.config();

const MAILJET_API_KEY = process.env.MAIL_JET_API_KEY as string;
const MAILJET_SECRET_KEY = process.env.MAIL_JET_SECRET_KEY as string;

const mailjetClient = mailjet.apiConnect(MAILJET_API_KEY, MAILJET_SECRET_KEY);

interface EmailMessage {
    From: {
      Email: string;
      Name: string;
    };
    To: Array<{
      Email: string;
      Name: string;
    }>;
    Subject: string;
    TextPart: string;
    HTMLPart: string;
    Attachments?: Array<{
      ContentType: string;
      Filename: string;
      Base64Content: string;
    }>;
}

async function sendEmail(
  toEmail: string,
  toName: string,
  subject: string,
  textContent: string,
  htmlContent: string,
  attachment?: string
) {
  try {
    let request;

    const message: EmailMessage = {
        From: {
            Email: "secretary@edu.umch.de",
            Name: "Ticket SYSTEM"
        },
        To: [{
            Email: toEmail,
            Name: toName
        }],
        Subject: subject,
        TextPart: textContent,
        HTMLPart: htmlContent
    }

    if (attachment) {
        const filePath = path.join(__dirname, "..", "public", attachment);
  
        if (!fs.existsSync(filePath)) {
          throw new Error(`Attachment file not found: ${filePath}`);
        }
        const fileContent = fs.readFileSync(filePath).toString("base64");
        message.Attachments = [{
            ContentType: "application/pdf", // MIME type of the file
            Filename: "Certificate.pdf", // Name to display in the email
            Base64Content: fileContent
        }]
    }

    request = mailjetClient.post("send", { version: "v3.1" }).request({
        Messages: [message]
    });

    const result = await request;
    return result.body;
  } catch (error: any) {
    console.error("Error sending email:", error.statusCode, error.response?.text, error);
    throw error;
  }
}

module.exports = { sendEmail };
