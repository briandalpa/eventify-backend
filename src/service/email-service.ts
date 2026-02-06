import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../application/logging';
import { EmailOptions } from '../model/email-model';

export class EmailService {
  private static transporter: Transporter;
  // Initialize email transporter (call once on app startup)
  static initialize(): void {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    logger.info('Email service initialized with Ethereal SMTP');
  }

  // Render email template
  private static renderTemplate(
    template: string,
    data: Record<string, any>,
  ): string {
    const templates: Record<string, (data: any) => string> = {
      'transaction-accepted': (data) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Transaction Accepted</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName || 'Valued Customer'},</p>
              <p>Great news! Your transaction has been <strong>accepted</strong>.</p>
              
              <div class="details">
                <h3>Transaction Details</h3>
                <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
                <p><strong>Event:</strong> ${data.eventName}</p>
                ${data.quantity ? `<p><strong>Quantity:</strong> ${data.quantity} ticket(s)</p>` : ''}
                ${data.totalAmount ? `<p><strong>Total Amount:</strong> Rp ${data.totalAmount.toLocaleString('id-ID')}</p>` : ''}
              </div>
              
              <p>Your tickets are confirmed! Check your account for more details.</p>
              <p>See you at the event! 🎉</p>
            </div>
            <div class="footer">
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      'transaction-rejected': (data) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336; }
            .refund-box { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Transaction Rejected</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName || 'Valued Customer'},</p>
              <p>Unfortunately, your transaction has been <strong>rejected</strong>.</p>
              
              <div class="details">
                <h3>Transaction Details</h3>
                <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
                <p><strong>Event:</strong> ${data.eventName}</p>
                ${data.quantity ? `<p><strong>Quantity:</strong> ${data.quantity} ticket(s)</p>` : ''}
                ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              </div>
              
              ${
                data.pointsRefunded > 0 ||
                data.couponRefunded ||
                data.quantity > 0
                  ? `
              <div class="refund-box">
                <h3>💰 Refunds Processed</h3>
                ${data.pointsRefunded > 0 ? `<p>✅ <strong>${data.pointsRefunded} points</strong> have been refunded to your account.</p>` : ''}
                ${data.couponRefunded ? `<p>✅ Your <strong>coupon</strong> has been restored and can be used again.</p>` : ''}
                ${data.quantity > 0 ? `<p>✅ <strong>${data.quantity} seat(s)</strong> have been released back to the event.</p>` : ''}
              </div>
              `
                  : ''
              }
              
              <p>We apologize for any inconvenience. Please contact support if you have questions.</p>
            </div>
            <div class="footer">
              <p>If you believe this is a mistake, please reach out to our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      'referral-reward': (data) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .reward-box { background-color: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .coupon-code { font-size: 24px; font-weight: bold; color: #1976D2; padding: 10px; background: white; border-radius: 5px; display: inline-block; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome! Your Rewards Are Ready</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              <p>Thanks for joining us through a referral! We've prepared some special rewards for you:</p>
              
              <div class="reward-box">
                <h3>Your Referral Rewards</h3>
                ${data.couponCode ? `<p>Discount Coupon:</p><div class="coupon-code">${data.couponCode}</div>` : ''}
                ${data.points ? `<p><strong>🎁 ${data.points} Loyalty Points</strong> added to your account!</p>` : ''}
              </div>
              
              <p>Start exploring events and use your rewards on your first purchase!</p>
            </div>
            <div class="footer">
              <p>Happy shopping! 🎊</p>
            </div>
          </div>
        </body>
        </html>
      `,

      'password-reset': (data) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #FF9800; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
              
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
              </div>
            </div>
            <div class="footer">
              <p>For security reasons, never share this email with anyone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const templateFn = templates[template];
    if (!templateFn) {
      throw new Error(`Email template "${template}" not found`);
    }

    return templateFn(data);
  }

  // Send email
  private static async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error(
        'Email service not initialized. Call EmailService.initialize() first.',
      );
    }

    try {
      const html = this.renderTemplate(options.template, options.data);

      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Eventify" <noreply@example.com>',
        to: options.to,
        subject: options.subject,
        html,
      });

      logger.info(`📧 Email sent to ${options.to}: ${info.messageId}`);

      // Show preview URL for Ethereal
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`👀 Preview email: ${previewUrl}`);
      }
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}: ${error}`);
      throw error;
    }
  }

  // Send transaction acceptance email
  static async sendTransactionAcceptedEmail(
    recipientEmail: string,
    eventName: string,
    transactionId: string,
    userName?: string,
    quantity?: number,
    totalAmount?: number,
  ): Promise<void> {
    const email: EmailOptions = {
      to: recipientEmail,
      subject: `Transaction Confirmed - ${eventName}`,
      template: 'transaction-accepted',
      data: {
        eventName,
        transactionId,
        userName,
        quantity,
        totalAmount,
      },
    };

    try {
      await this.sendEmail(email);
      logger.info(
        `[EMAIL] Transaction accepted email sent to ${recipientEmail}`,
      );
    } catch (error) {
      logger.error(`Failed to send transaction accepted email: ${error}`);
    }
  }

  // Send transaction rejection email
  static async sendTransactionRejectedEmail(
    recipientEmail: string,
    eventName: string,
    transactionId: string,
    reason?: string,
    userName?: string,
    quantity?: number,
    pointsRefunded?: number,
    couponRefunded?: boolean,
  ): Promise<void> {
    const email: EmailOptions = {
      to: recipientEmail,
      subject: `Transaction Rejected - ${eventName}`,
      template: 'transaction-rejected',
      data: {
        eventName,
        transactionId,
        reason,
        userName,
        quantity,
        pointsRefunded: pointsRefunded || 0,
        couponRefunded: couponRefunded || false,
      },
    };

    try {
      await this.sendEmail(email);
      logger.info(
        `[EMAIL] Transaction rejected email sent to ${recipientEmail}`,
      );
    } catch (error) {
      logger.error(`Failed to send transaction rejected email: ${error}`);
    }
  }

  // Send referral reward email
  static async sendReferralRewardEmail(
    recipientEmail: string,
    couponCode: string,
    points: number,
  ): Promise<void> {
    const email: EmailOptions = {
      to: recipientEmail,
      subject: 'Welcome! Your referral rewards are ready',
      template: 'referral-reward',
      data: {
        couponCode,
        points,
      },
    };

    try {
      await this.sendEmail(email);
      logger.info(`[EMAIL] Referral reward email sent to ${recipientEmail}`);
    } catch (error) {
      logger.error(`Failed to send referral reward email: ${error}`);
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(
    recipientEmail: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<void> {
    const email: EmailOptions = {
      to: recipientEmail,
      subject: 'Reset Your Password',
      template: 'password-reset',
      data: {
        resetUrl,
        resetToken,
      },
    };

    try {
      await this.sendEmail(email);
      logger.info(`[EMAIL] Password reset email sent to ${recipientEmail}`);
    } catch (error) {
      logger.error(`Failed to send password reset email: ${error}`);
    }
  }
}
