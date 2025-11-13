import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Rock Control <onboarding@rockcontrol.com>';

export async function sendPasswordResetEmail(to: string, resetToken: string, userName: string) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset Your Password - Rock Control',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E23B2E;">Reset Your Password</h2>
          <p>Hi ${userName},</p>
          <p>You requested to reset your password for your Rock Control account.</p>
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #E23B2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br>${resetUrl}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendEmailVerification(to: string, verificationToken: string, userName: string) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Verify Your Email - Rock Control',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E23B2E;">Welcome to Rock Control!</h2>
          <p>Hi ${userName},</p>
          <p>Thanks for signing up! Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; background-color: #E23B2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br>${verifyUrl}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendAccessRequestNotification(to: string, requesterName: string, requesterEmail: string, organizationName: string) {
  const adminUrl = `${process.env.APP_URL || 'http://localhost:5000'}/admin/access-requests`;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `New Access Request - ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E23B2E;">New Access Request</h2>
          <p>${requesterName} (${requesterEmail}) has requested access to ${organizationName}.</p>
          <a href="${adminUrl}" style="display: inline-block; background-color: #E23B2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Review Request</a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send access request notification:', error);
    throw new Error('Failed to send access request notification');
  }
}

export async function sendAccessRequestApproved(to: string, organizationName: string) {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:5000'}/login`;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Access Approved - ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E23B2E;">Access Request Approved</h2>
          <p>Great news! Your access request to ${organizationName} has been approved.</p>
          <p>You can now log in to Rock Control and start managing your construction projects.</p>
          <a href="${loginUrl}" style="display: inline-block; background-color: #E23B2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Log In</a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send approval email:', error);
    throw new Error('Failed to send approval email');
  }
}
