const nodemailer = require('nodemailer');

// Create a transporter (the email sender)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'magnanimus1257@gmail.com',        // your Gmail address
        pass: 'tlzf vcnr ngkz jztk'               // your App Password
    }
});

// Verify the connection (optional, but good for debugging)
transporter.verify((error, success) => {
    if (error) {
        console.error('Email service error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// 1. Send a welcome email to new users
const sendWelcomeEmail = async (userEmail, username) => {
    try {
        const mailOptions = {
            from: '"NOVA PORTAL" <magnanimus1257@gmail.com>', // corrected
            to: userEmail,
            subject: 'Welcome to Our Platform! 🎉',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h1 style="color: #667eea;">Welcome, ${username}!</h1>
                    <p>Thank you for registering. We're excited to have you on board!</p>
                    <p><small>If you didn't create this account, please contact support.</small></p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error };
    }
};

// 2. Send a password change notification
const sendPasswordChangeNotification = async (userEmail, username) => {
    try {
        const mailOptions = {
            from: '"NOVA PORTAL" <magnanimus1257@gmail.com>', // corrected
            to: userEmail,
            subject: 'Your Password Was Changed',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #dc3545;">Password Changed</h2>
                    <p>Hello ${username},</p>
                    <p>Your password was successfully changed on ${new Date().toLocaleString()}.</p>
                    <p>If you did not make this change, please reset your password immediately.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password change email sent');
        return { success: true };
    } catch (error) {
        console.error('Error sending password change email:', error);
        return { success: false };
    }
};

// 3. Send an alert to the admin when a new user registers
const sendAdminAlert = async (newUser) => {
    try {
        const mailOptions = {
            from: '"System Alerts" <magnanimus1257@gmail.com>',
            to: 'magnanimus1257@gmail.com',   // admin email (same as sender here)
            subject: '🔔 New User Registered',
            html: `
                <h3>New user registered:</h3>
                <ul>
                    <li>Username: ${newUser.username}</li>
                    <li>Email: ${newUser.email}</li>
                    <li>Time: ${new Date().toLocaleString()}</li>
                </ul>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Admin alert sent');
    } catch (error) {
        console.error('Error sending admin alert:', error);
    }
};

// 4. NEW: Send OTP email for verification
const sendOtpEmail = async (userEmail, otp) => {
    try {
        const mailOptions = {
            from: '"NOVA PORTAL" <magnanimus1257@gmail.com>',
            to: userEmail,
            subject: 'Your OTP for Registration',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #667eea; text-align: center;">Email Verification</h2>
                    <p style="font-size: 16px;">Your One-Time Password (OTP) is:</p>
                    <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px;">This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return { success: false, error };
    }
};

// Export all functions (including the new one)
module.exports = {
    sendWelcomeEmail,
    sendPasswordChangeNotification,
    sendAdminAlert,
    sendOtpEmail
};