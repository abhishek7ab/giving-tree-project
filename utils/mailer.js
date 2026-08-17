let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (e) {
    console.warn("--- WARNING: nodemailer module not found. Email features are disabled. ---");
    console.warn("Please run 'npm install nodemailer' to enable email notifications.");
}

let transporter;

async function createTransporter() {
    if (!nodemailer) return null;
    if (transporter) return transporter;

    try {
        let testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        console.log('--- Mailer Configured (Ethereal Test Account) ---');
        console.log('User:', testAccount.user);
        console.log('Pass:', testAccount.pass);
        console.log('-------------------------------------------------');

        return transporter;
    } catch (err) {
        console.error("Failed to create test account:", err);
        return null;
    }
}

exports.sendStatusEmail = async (to, status, itemName, isAdmin = false) => {
    if (!nodemailer) {
        console.log(`[MOCK EMAIL] To: ${to}, Status: ${status}, Item: ${itemName}, Admin: ${isAdmin}`);
        return { messageId: 'mock-id', previewUrl: '#' };
    }

    try {
        const mailTransporter = await createTransporter();
        if (!mailTransporter) return;

        const subject = status === 'accepted' 
            ? `Good news! Your request for "${itemName}" was accepted`
            : `Update on your request for "${itemName}"`;

        let text;
        if (status === 'accepted') {
            if (isAdmin) {
                text = `Hi,\n\nGreat news! Your request for "${itemName}" has been accepted by a platform admin. You can now chat with the owner on the Giving Tree platform to arrange the pickup.\n\nHappy sharing!`;
            } else {
                text = `Hi,\n\nGreat news! Your request for "${itemName}" has been accepted by the owner. You can now chat with them on the Giving Tree platform to arrange the pickup.\n\nHappy sharing!`;
            }
        } else {
            if (isAdmin) {
                text = `Hi,\n\nWe wanted to let you know that your request for "${itemName}" was rejected by an admin. Don't worry, there are plenty of other items available on the platform!\n\nBest,\nThe Giving Tree Team`;
            } else {
                text = `Hi,\n\nWe wanted to let you know that your request for "${itemName}" was not accepted this time. Don't worry, there are plenty of other items available on the platform!\n\nBest,\nThe Giving Tree Team`;
            }
        }

        const info = await mailTransporter.sendMail({
            from: '"Giving Tree" <noreply@givingtree.com>',
            to: to,
            subject: subject,
            text: text,
        });

        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
