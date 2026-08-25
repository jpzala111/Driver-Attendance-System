import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { EmailService } from '../emailService';

export const adminRouter = Router();

// Helper to determine accurate public base URL
function getBaseUrl(req: any): string {
  // If Render provides RENDER_EXTERNAL_URL (e.g. https://driver-app.onrender.com)
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }

  // Check incoming request headers (origin, host, x-forwarded-host)
  const origin = req.get('origin');
  if (origin && !origin.includes('localhost:3000') && origin.startsWith('http')) {
    return origin.replace('ais-dev-', 'ais-pre-').replace(/\/$/, '');
  }

  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  if (host && !host.includes('localhost:3000')) {
    let cleanHost = host;
    if (cleanHost.includes('ais-dev-')) {
      cleanHost = cleanHost.replace('ais-dev-', 'ais-pre-');
    }
    return `${proto}://${cleanHost}`.replace(/\/$/, '');
  }

  const settings = db.getSettings();
  if (settings.public_app_url && settings.public_app_url.trim().startsWith('http') && !settings.public_app_url.includes('ais-dev-')) {
    return settings.public_app_url.trim().replace(/\/$/, '');
  }

  return process.env.PUBLIC_APP_URL || process.env.APP_URL || 'https://ais-pre-noiybzqy3aovqqay7h6ofz-454228176347.asia-east1.run.app';
}

// GET /api/admin/dashboard-metrics
adminRouter.get('/dashboard-metrics', (_req, res) => {
  try {
    const metrics = db.getDashboardMetrics();
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

// GET /api/admin/drivers
adminRouter.get('/drivers', (_req, res) => {
  try {
    const drivers = db.getEmployees();
    return res.json({ drivers });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve drivers.' });
  }
});

// POST /api/admin/drivers (Create Driver)
adminRouter.post('/drivers', async (req, res) => {
  try {
    const { name, employee_code, username, password, phone, email, odoo_employee_id } = req.body;

    if (!name || !employee_code || !username || !password || !phone || !email) {
      return res.status(400).json({ error: 'All driver fields (name, code, username, password, phone, email) are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check unique employee code
    const existingCode = db.findEmployeeByCode(employee_code);
    if (existingCode) {
      return res.status(400).json({ error: `Driver with employee code ${employee_code} already exists.` });
    }

    // Check unique username
    const existingUser = db.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }

    const { employee, approval_request } = db.createDriver({
      name,
      employee_code,
      username,
      password,
      phone,
      email,
      odoo_employee_id,
    });

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: 'DRIVER_CREATED',
      entity_type: 'EMPLOYEE',
      entity_id: employee.id,
      new_value: { employee_code: employee.employee_code, name: employee.name, username: employee.username },
      description: `Admin created driver profile for ${employee.name} (${employee.employee_code}). Approval request dispatched to higher authority.`,
    });

    // Send email via EmailService safely
    const baseUrl = getBaseUrl(req);
    const settings = db.getSettings();
    let emailResult: any = null;
    try {
      emailResult = await EmailService.sendDriverApprovalEmail({
        request: approval_request,
        employee,
        settings,
        baseUrl,
      });
    } catch (e: any) {
      console.error('Email dispatch error (non-fatal):', e);
      emailResult = {
        success: false,
        approvalUrl: `${baseUrl}/?approve_token=${encodeURIComponent(approval_request.raw_token)}`,
        error: e.message || 'Email dispatch failed',
      };
    }

    const emailActuallySent = Boolean(emailResult?.success);
    const message = emailActuallySent
      ? `Driver request created for ${employee.name}. Approval email dispatched to Boss at ${approval_request.approval_email}. Driver cannot log in until your boss accepts the email request.`
      : `Driver request created for ${employee.name}, but the approval EMAIL COULD NOT BE SENT (${emailResult?.error || 'no email provider configured'}). Use the approval link below to share it with your boss manually, and check Admin > Settings to fix email delivery.`;

    return res.json({
      success: true,
      message,
      approval_url: `${baseUrl}/?approve_token=${encodeURIComponent(approval_request.raw_token)}`,
      employee,
      email_dispatch: {
        success: emailActuallySent,
        recipient: emailResult?.recipient,
        error: emailResult?.error,
      },
      approval_request: {
        id: approval_request.id,
        employee_id: approval_request.employee_id,
        approval_email: approval_request.approval_email,
        status: approval_request.status,
        expires_at: approval_request.expires_at,
      },
    });
  } catch (err: any) {
    console.error('Create driver error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create driver account.' });
  }
});

// PUT /api/admin/drivers/:id
adminRouter.put('/drivers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, odoo_employee_id } = req.body;

    const emp = db.findEmployeeById(id);
    if (!emp) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const oldCopy = { ...emp };
    const updated = db.updateEmployee(id, {
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(odoo_employee_id !== undefined ? { odoo_employee_id } : {}),
    });

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: 'DRIVER_UPDATED',
      entity_type: 'EMPLOYEE',
      entity_id: id,
      old_value: oldCopy,
      new_value: updated,
      description: `Admin updated driver profile ${emp.name} (${emp.employee_code})`,
    });

    return res.json({ success: true, employee: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update driver.' });
  }
});

// POST /api/admin/drivers/:id/toggle-active
adminRouter.post('/drivers/:id/toggle-active', (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const emp = db.findEmployeeById(id);
    if (!emp) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    db.setEmployeeActiveState(id, Boolean(active));

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: active ? 'DRIVER_ACTIVATED' : 'DRIVER_DEACTIVATED',
      entity_type: 'EMPLOYEE',
      entity_id: id,
      description: `Admin ${active ? 'activated' : 'deactivated'} driver account ${emp.name} (${emp.employee_code})`,
    });

    return res.json({ success: true, message: `Driver is now ${active ? 'Active' : 'Inactive'}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle driver active status.' });
  }
});

// POST /api/admin/drivers/:id/reset-password
adminRouter.post('/drivers/:id/reset-password', (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const emp = db.findEmployeeById(id);
    if (!emp) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const user = db.findUserByEmployeeId(id);
    if (!user) {
      return res.status(404).json({ error: 'Driver user login not found.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.updateUserPassword(user.id, newHash);

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: 'PASSWORD_RESET',
      entity_type: 'USER',
      entity_id: user.id,
      description: `Admin reset password for driver ${emp.name} (${emp.employee_code})`,
    });

    return res.json({
      success: true,
      message: `Password for driver ${emp.name} has been reset successfully. Admin can now communicate credentials securely to the driver.`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/admin/drivers/:id/resend-approval
adminRouter.post('/drivers/:id/resend-approval', async (req, res) => {
  try {
    const { id } = req.params;
    const approvalReq = db.resendApprovalRequest(id);

    if (!approvalReq) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    const emp = db.findEmployeeById(id);
    if (!emp) {
      return res.status(404).json({ error: 'Driver employee details not found.' });
    }

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: 'APPROVAL_RESENT',
      entity_type: 'APPROVAL_REQUEST',
      entity_id: approvalReq.id,
      description: `Admin resent activation approval email for driver ${approvalReq.employee_name} (${approvalReq.employee_code})`,
    });

    // Send real email via EmailService
    const baseUrl = getBaseUrl(req);
    const settings = db.getSettings();
    let emailResult: any = null;
    try {
      emailResult = await EmailService.sendDriverApprovalEmail({
        request: approvalReq,
        employee: emp,
        settings,
        baseUrl,
      });
    } catch (e: any) {
      console.error('Email resend error (non-fatal):', e);
      emailResult = {
        success: false,
        approvalUrl: `${baseUrl}/?approve_token=${encodeURIComponent(approvalReq.raw_token)}`,
        error: e.message || 'Email dispatch failed',
      };
    }

    const emailActuallySent = Boolean(emailResult?.success);
    const message = emailActuallySent
      ? `Approval request resent to Boss at ${approvalReq.approval_email}.`
      : `Could not send the approval EMAIL (${emailResult?.error || 'no email provider configured'}). Use the approval link to share it with your boss manually, and check Admin > Settings to fix email delivery.`;

    return res.json({
      success: true,
      message,
      approval_url: `${baseUrl}/?approve_token=${encodeURIComponent(approvalReq.raw_token)}`,
      approval_request: {
        id: approvalReq.id,
        employee_id: approvalReq.employee_id,
        approval_email: approvalReq.approval_email,
        status: approvalReq.status,
        expires_at: approvalReq.expires_at,
      },
      email_dispatch: {
        success: emailActuallySent,
        recipient: emailResult?.recipient,
        error: emailResult?.error,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to resend approval.' });
  }
});

// POST /api/admin/drivers/:id/approve-direct (Direct Admin Approval Override)
adminRouter.post('/drivers/:id/approve-direct', (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    const result = db.approveDriverDirectly(id, adminUser);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to approve driver directly.' });
  }
});

// GET /api/admin/approvals
adminRouter.get('/approvals', (_req, res) => {
  try {
    const list = db.getApprovalRequests();
    return res.json({ approvals: list });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch approval requests.' });
  }
});

// GET /api/admin/attendance
adminRouter.get('/attendance', (req, res) => {
  try {
    const { employee_id, status, startDate, endDate } = req.query as Record<string, string>;
    const list = db.getAttendance({ employee_id, status, startDate, endDate });
    return res.json({ attendance: list });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve attendance list.' });
  }
});

// GET /api/admin/attendance/:id
adminRouter.get('/attendance/:id', (req, res) => {
  const att = db.findAttendanceById(req.params.id);
  if (!att) {
    return res.status(404).json({ error: 'Attendance record not found.' });
  }
  return res.json({ attendance: att });
});

// PUT /api/admin/attendance/:id (Edit Attendance with Audit Log)
adminRouter.put('/attendance/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { updates, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A mandatory reason for administrative correction must be provided.' });
    }

    const adminUser = {
      id: (req.headers['x-admin-id'] as string) || 'admin-01',
      username: (req.headers['x-admin-name'] as string) || 'Admin',
    };

    const result = db.updateAttendanceByAdmin(id, updates || {}, adminUser, reason);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update attendance record.' });
  }
});

// GET /api/admin/odometer
adminRouter.get('/odometer', (_req, res) => {
  try {
    const records = db.getOdometerRecords();
    return res.json({ odometer_records: records });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch odometer records.' });
  }
});

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', (_req, res) => {
  try {
    const logs = db.getAuditLogs();
    return res.json({ audit_logs: logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// GET /api/admin/settings
adminRouter.get('/settings', (_req, res) => {
  try {
    const settings = db.getSettings();
    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch system settings.' });
  }
});

// Handle saving settings for both PUT and POST methods
const handleSaveSettings = (req: any, res: any) => {
  try {
    const adminUser = {
      id: (req.headers['x-admin-id'] as string) || 'admin-01',
      username: (req.headers['x-admin-name'] as string) || 'Admin',
    };

    const updates = { ...req.body };
    if (updates.smtp_host && updates.smtp_user) {
      updates.smtp_configured = true;
    }

    const updated = db.updateSettings(updates, adminUser);
    return res.json({ success: true, settings: updated, message: 'Settings saved successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update system settings.' });
  }
};

adminRouter.put('/settings', handleSaveSettings);
adminRouter.post('/settings', handleSaveSettings);

// POST /api/admin/test-email (Test SMTP connection to Boss Email)
adminRouter.post('/test-email', async (req, res) => {
  try {
    const { toEmail, customSettings } = req.body;
    const currentSettings = customSettings ? { ...db.getSettings(), ...customSettings } : db.getSettings();
    const targetEmail = toEmail || currentSettings.higher_authority_email;

    if (!targetEmail) {
      return res.status(400).json({ error: 'No recipient email specified.' });
    }

    const baseUrl = getBaseUrl(req);
    const result = await EmailService.sendTestEmail({
      toEmail: targetEmail,
      settings: currentSettings,
      baseUrl,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message, details: result.error });
    }

    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch test email.' });
  }
});

