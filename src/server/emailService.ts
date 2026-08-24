import nodemailer from 'nodemailer';
import type { ApprovalRequest, Employee, SystemSettings } from '../types';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  error?: string;
  isRealSmtp: boolean;
  approvalUrl?: string;
}

export class EmailService {
  /**
   * Build Nodemailer transport based on system settings or environment variables
   */
  public static getTransporter(settings?: SystemSettings) {
    const host = settings?.smtp_host || process.env.SMTP_HOST || '';
    const port = Number(settings?.smtp_port || process.env.SMTP_PORT || 587);
    const secure = settings?.smtp_secure ?? (port === 465);
    const user = settings?.smtp_user || process.env.SMTP_USER || '';
    const pass = settings?.smtp_pass || process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';

    if (!host || !user) {
      return null;
    }

    const socketTimeout = 5000;
    const connectionTimeout = 5000;
    const greetingTimeout = 5000;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert issues in dev/private relays
      },
    });
  }

  /**
   * Send Driver Approval Email to Higher Authority / Boss
   */
  public static async sendDriverApprovalEmail(params: {
    request: ApprovalRequest;
    employee: Employee;
    settings: SystemSettings;
    baseUrl: string;
  }): Promise<EmailSendResult> {
    const { request, employee, settings, baseUrl } = params;
    const recipient = request.approval_email || settings.higher_authority_email || process.env.HIGHER_AUTHORITY_EMAIL || 'approvals@company.com';
    const effectiveBaseUrl = (settings.public_app_url && settings.public_app_url.startsWith('http')
      ? settings.public_app_url
      : baseUrl
    ).replace('ais-dev-', 'ais-pre-').replace(/\/$/, '');
    const approvalUrl = `${effectiveBaseUrl}/?approve_token=${encodeURIComponent(request.raw_token)}`;
    const quickApproveUrl = `${effectiveBaseUrl}/api/approval/action/activate/${encodeURIComponent(request.raw_token)}`;
    const quickRejectUrl = `${effectiveBaseUrl}/api/approval/action/reject/${encodeURIComponent(request.raw_token)}`;
    const rejectUrl = `${effectiveBaseUrl}/?approve_token=${encodeURIComponent(request.raw_token)}&action=reject`;

    const fromAddress = settings.smtp_from || process.env.FROM_EMAIL || `"Driver Attendance System" <${settings.smtp_user || 'no-reply@attendance-system.com'}>`;
    const companyName = settings.company_name || 'Fleet & Logistics Transport';

    const subject = `[ACTION REQUIRED] New Driver Account Approval: ${employee.name} (${employee.employee_code})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Driver Account Approval Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 28px 32px; text-align: left;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 6px;">
                ${companyName} &bull; Security &amp; Access Control
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                New Driver Activation Request
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; color: #cbd5e1; margin-top: 0; line-height: 1.6;">
                Hello Boss / Higher Authority,
              </p>
              <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
                A new driver profile has been created in the <strong>Driver Attendance Management System</strong> and requires your cryptographic authorization before the driver is allowed to log in and record shift attendance.
              </p>

              <!-- Driver Information Box -->
              <table role="presentation" width="100%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; margin: 24px 0; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1e293b;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Driver Full Name</span>
                    <div style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-top: 2px;">${employee.name}</div>
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1e293b;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Employee Code</span>
                    <div style="font-size: 15px; font-weight: 700; color: #60a5fa; font-family: monospace; margin-top: 2px;">${employee.employee_code}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1e293b;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Portal Username</span>
                    <div style="font-size: 14px; font-weight: 600; color: #cbd5e1; font-family: monospace; margin-top: 2px;">${employee.username}</div>
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1e293b;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Mobile Phone</span>
                    <div style="font-size: 14px; color: #cbd5e1; margin-top: 2px;">${employee.phone || 'N/A'}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Driver Email</span>
                    <div style="font-size: 14px; color: #cbd5e1; margin-top: 2px;">${employee.email || 'N/A'}</div>
                  </td>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Odoo ERP ID</span>
                    <div style="font-size: 14px; color: #38bdf8; font-family: monospace; margin-top: 2px;">${employee.odoo_employee_id || 'Pending Auto-Sync'}</div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 6px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; color: #c7d2fe; line-height: 1.5;">
                  <strong>One-Time Secure Link:</strong> This cryptographic link expires in <strong>${settings.approval_token_expiry_hours || 48} hours</strong> and can only be used once. No login is required for Higher Authority approval.
                </p>
              </div>

              <!-- Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <a href="${quickApproveUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.4); text-align: center;">
                      &check; 1-Click Approve &amp; Activate Driver
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <a href="${approvalUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px; text-align: center;">
                      Open Interactive Approval Portal
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${quickRejectUrl}" target="_blank" style="display: inline-block; background-color: #334155; color: #cbd5e1; font-size: 13px; font-weight: 600; text-decoration: none; padding: 8px 20px; border-radius: 8px; text-align: center; border: 1px solid #475569;">
                      Reject &amp; Keep Inactive
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
                  Direct 1-Click Approval URL:
                </p>
                <div style="background-color: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px solid #1e293b; font-family: monospace; font-size: 11px; color: #38bdf8; word-break: break-all; margin-bottom: 10px;">
                  ${quickApproveUrl}
                </div>
                <p style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
                  Interactive Web Page:
                </p>
                <div style="background-color: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px solid #1e293b; font-family: monospace; font-size: 11px; color: #94a3b8; word-break: break-all;">
                  ${approvalUrl}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                Automated notification sent by ${companyName} Attendance Portal.<br>
                Security Hash: ${request.token_hash.substring(0, 16)}...
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const textContent = `
[ACTION REQUIRED] New Driver Account Approval

Hello Higher Authority / Boss,

A new driver account has been created and requires your approval to be activated:

- Driver Name: ${employee.name}
- Employee Code: ${employee.employee_code}
- Username: ${employee.username}
- Phone: ${employee.phone || 'N/A'}
- Driver Email: ${employee.email || 'N/A'}

To APPROVE and ACTIVATE this driver account, click the link below:
${approvalUrl}

To REJECT this activation request:
${rejectUrl}

Note: This link is valid for ${settings.approval_token_expiry_hours || 48} hours.
Security Hash: ${request.token_hash}
`;

    const transporter = this.getTransporter(settings);

    if (!transporter) {
      console.warn(`[EmailService] SMTP not fully configured. Email prepared for: ${recipient}`);
      return {
        success: true,
        recipient,
        isRealSmtp: false,
        approvalUrl,
        error: 'SMTP host/user not configured. Approval link generated successfully and available in Admin Portal and simulated inbox.',
      };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EmailService] Real email dispatched successfully to ${recipient}. MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        recipient,
        isRealSmtp: true,
        approvalUrl,
      };
    } catch (err: any) {
      let friendlyError = err.message || 'Failed to send email via SMTP server.';
      if (err.message && (err.message.includes('535') || err.message.includes('Username and Password not accepted') || err.message.includes('BadCredentials'))) {
        friendlyError = 'Gmail/SMTP rejected login (535 Bad Credentials). Gmail requires a 16-character "Google App Password" instead of your normal account password. Generate one at https://myaccount.google.com/apppasswords (under 2-Step Verification) and enter it in System Settings > SMTP Password.';
      }

      console.error(`[EmailService] Failed to dispatch SMTP email to ${recipient}: ${friendlyError}`);
      return {
        success: false,
        recipient,
        isRealSmtp: true,
        approvalUrl,
        error: friendlyError,
      };
    }
  }

  /**
   * Send a test email to verify SMTP connection to Boss email
   */
  public static async sendTestEmail(params: {
    toEmail: string;
    settings: SystemSettings;
    baseUrl: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    const { toEmail, settings, baseUrl } = params;

    if (!toEmail || !toEmail.includes('@')) {
      return { success: false, message: 'Invalid recipient email address.' };
    }

    const transporter = this.getTransporter(settings);
    if (!transporter) {
      return {
        success: false,
        message: 'SMTP credentials missing. Please enter your SMTP Host, Port, Username and Password.',
      };
    }

    const fromAddress = settings.smtp_from || process.env.FROM_EMAIL || `"Driver Attendance System" <${settings.smtp_user}>`;

    try {
      // First verify connection
      await transporter.verify();

      // Send test message
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[Test] Driver Attendance System - Email Delivery Verification`,
        text: `Hello Boss!\n\nThis is a confirmation test email from the Driver Attendance Management System (${settings.company_name}).\nYour email delivery configuration is working correctly!\n\nPortal URL: ${baseUrl}\nTimestamp: ${new Date().toISOString()}`,
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
          <h2 style="color: #60a5fa; margin-top: 0;">&check; Email Delivery Configuration Verified</h2>
          <p style="color: #cbd5e1; font-size: 14px;">
            Hello Boss! This is a test email sent from <strong>${settings.company_name}</strong>.
          </p>
          <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;"><strong>Recipient Email:</strong> ${toEmail}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;"><strong>SMTP Host:</strong> ${settings.smtp_host || 'N/A'}</p>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;"><strong>Dispatched At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #4ade80; font-size: 14px; font-weight: bold;">
            All driver activation requests will now be reliably delivered to your inbox.
          </p>
        </div>
        `,
      });

      return {
        success: true,
        message: `Test email successfully delivered to ${toEmail}! Message ID: ${info.messageId}`,
      };
    } catch (err: any) {
      let friendlyError = err.message || 'Unknown SMTP error';
      if (err.message && (err.message.includes('535') || err.message.includes('Username and Password not accepted') || err.message.includes('BadCredentials'))) {
        friendlyError = 'Invalid login credentials (535). For Gmail/Google Workspace, you MUST use a 16-character "App Password" instead of your normal account password. See the Gmail instructions box below.';
      }

      console.error('[EmailService] Test email failed:', friendlyError);
      return {
        success: false,
        message: `SMTP Error: ${friendlyError}`,
        error: friendlyError,
      };
    }
  }
}
