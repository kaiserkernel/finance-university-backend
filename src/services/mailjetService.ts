import dotenv from "dotenv";
import mailjet from "node-mailjet";

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
}

async function sendEmail(
  toEmail: string,
  toName: string,
  reqStatus: string,
  milestone: number,
  announcementTitle: string,
  adminRoleInfo: string
) {
  try {
    let request;

    const subject = "Grant system announcement";
    const textContent = `Your application is ${reqStatus || "pending"}`;
    const htmlContent = `
      <p>Dear ${toName}</p>
      <p>Announcement Title: ${announcementTitle}</p>
      <p>The application that you made as milestone ${milestone} was ${reqStatus}</p>
      <p>${adminRoleInfo}</p>
    `

    const message: EmailMessage = {
        From: {
              Email: "secretary@edu.umch.de",
              Name: "UMCH TICKET SYSTEM"
        },
        To: [{
            Email: toEmail,
            Name: toName
        }],
        Subject: subject,
        TextPart: textContent,
        HTMLPart: htmlContent
    }
    
    request = await mailjetClient.post("send", { version: "v3" }).request({
        Messages: [message]
    }, { timeout: 15000 });

    return request.body;
  } catch (error: unknown) {
    if (error instanceof Error) {
        console.error("Error sending email:", error.message);
    } else {
        console.error("Unknown error:", error);
    }
  }
}

export default sendEmail;
