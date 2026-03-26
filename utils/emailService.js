const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/?token=${resetToken}`;
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0f172a;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Password Reset Request</h1>
          </div>
          <div style="padding: 30px 20px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello,</p>
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your account. If you made this request, please click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Reset My Password</a>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.5;">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you don't reset your password within this time, you'll need to request a new reset link.
              </p>
            </div>
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6;">
              If you're having trouble clicking the button, copy and paste the following link into your browser:
              <br><span style="color: #0f172a; word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
          <div style="border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  });
};

const sendPasswordResetOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0f172a;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Password Reset OTP</h1>
          </div>
          <div style="padding: 30px 20px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello,</p>
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password. Please use the following OTP to proceed:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #f8f9fa; padding: 20px 40px; border-radius: 8px; border: 2px dashed #0f172a;">
                <span style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 8px;">${otp}</span>
              </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.5;">
                <strong>Security Notice:</strong> This OTP will expire in 10 minutes. Do not share this OTP with anyone.
              </p>
            </div>
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          <div style="border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  });
};

module.exports = { sendPasswordResetEmail, sendPasswordResetOTP };
