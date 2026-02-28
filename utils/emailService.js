const sgMail = require('@sendgrid/mail');

// Set SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Helper to send emails
const sendEmail = async ({ to, subject, html }) => {
    try {
        const msg = {
            to,
            from: process.env.EMAIL_USER || 'noreply@yourdomain.com', // must be verified sender in SendGrid
            subject,
            html
        };
        await sgMail.send(msg);
        console.log(`Email sent to ${to}: ${subject}`);
        return { success: true };
    } catch (error) {
        console.error('SendGrid error:', error.response?.body || error.message);
        return { success: false, error };
    }
};

// 1. Send a welcome email
const sendWelcomeEmail = async (userEmail, username) => {
    const subject = 'Welcome to Our Platform! 🎉';
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h1 style="color: #667eea;">Welcome, ${username}!</h1>
            <p>Thank you for registering. We're excited to have you on board!</p>
            <p><small>If you didn't create this account, please contact support.</small></p>
        </div>
    `;
    return sendEmail({ to: userEmail, subject, html });
};

// 2. Send password change notification
const sendPasswordChangeNotification = async (userEmail, username) => {
    const subject = 'Your Password Was Changed';
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #dc3545;">Password Changed</h2>
            <p>Hello ${username},</p>
            <p>Your password was successfully changed on ${new Date().toLocaleString()}.</p>
            <p>If you did not make this change, please reset your password immediately.</p>
        </div>
    `;
    return sendEmail({ to: userEmail, subject, html });
};

// 3. Send admin alert
const sendAdminAlert = async (newUser) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const subject = '🔔 New User Registered';
    const html = `
        <h3>New user registered:</h3>
        <ul>
            <li>Username: ${newUser.username}</li>
            <li>Email: ${newUser.email}</li>
            <li>Time: ${new Date().toLocaleString()}</li>
        </ul>
    `;
    return sendEmail({ to: adminEmail, subject, html });
};

// 4. Send OTP email
const sendOtpEmail = async (userEmail, otp) => {
    const subject = 'Your OTP for Registration';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #667eea; text-align: center;">Email Verification</h2>
            <p style="font-size: 16px;">Your One-Time Password (OTP) is:</p>
            <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px;">
                ${otp}
            </div>
            <p style="margin-top: 20px;">This OTP is valid for <strong>10 minutes</strong>.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    `;
    return sendEmail({ to: userEmail, subject, html });
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordChangeNotification,
    sendAdminAlert,
    sendOtpEmail
};