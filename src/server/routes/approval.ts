import { Router } from 'express';
import { db } from '../db';

export const approvalRouter = Router();

// HTML Quick-Approval GET Endpoint (for 1-click email button clicks without needing complex JS)
approvalRouter.get('/action/:action/:token', (req, res) => {
  try {
    const { action, token } = req.params;
    const isReject = action.toLowerCase() === 'reject';
    const approvalReq = db.findApprovalRequestByToken(token);

    if (!approvalReq) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Approval Link Expired - Driver Attendance</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d16; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #0f172a; border: 1px solid #334155; border-radius: 20px; max-width: 480px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            .icon { font-size: 48px; margin-bottom: 16px; }
            h1 { font-size: 20px; margin: 0 0 12px; color: #f87171; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
            .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⚠️</div>
            <h1>Invalid or Expired Link</h1>
            <p>This driver approval link is invalid, already processed, or has expired. Please log into the Admin portal or request a new approval email.</p>
            <a href="/" class="btn">Go to Application Home</a>
          </div>
        </body>
        </html>
      `);
    }

    const employee = db.findEmployeeById(approvalReq.employee_id);
    const result = db.processApproval(token, isReject ? 'REJECT' : 'ACTIVATE');

    const title = isReject ? 'Driver Request Rejected' : 'Driver Approved & Activated!';
    const color = isReject ? '#f59e0b' : '#10b981';
    const icon = isReject ? '🛑' : '✅';
    const message = isReject
      ? `You have rejected driver registration for <strong>${employee?.name || 'Driver'}</strong> (${employee?.employee_code || ''}). Their account remains deactivated.`
      : `Driver <strong>${employee?.name || 'Driver'}</strong> (${employee?.employee_code || ''}) has been verified and their account is now <strong>ACTIVE</strong>. They can now log in immediately.`;

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Driver Attendance System</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d16; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #0f172a; border: 1px solid ${color}40; border-radius: 24px; max-width: 500px; width: 100%; padding: 36px 30px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }
          .icon-badge { width: 64px; height: 64px; border-radius: 50%; background: ${color}20; border: 2px solid ${color}60; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
          h1 { font-size: 22px; margin: 0 0 14px; color: ${color}; font-weight: 700; }
          p { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
          .info-box { background: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .info-row:last-child { margin-bottom: 0; }
          .info-label { color: #64748b; }
          .info-val { color: #f1f5f9; font-weight: 600; }
          .btn { display: block; width: 100%; background: #1e293b; color: #f8fafc; text-decoration: none; padding: 14px 0; border-radius: 14px; font-weight: 600; font-size: 14px; box-sizing: border-box; border: 1px solid #334155; }
          .btn:hover { background: #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge">${icon}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Driver Name:</span><span class="info-val">${employee?.name || '-'}</span></div>
            <div class="info-row"><span class="info-label">Employee Code:</span><span class="info-val">${employee?.employee_code || '-'}</span></div>
            <div class="info-row"><span class="info-label">Contact Phone:</span><span class="info-val">${employee?.phone || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Account Status:</span><span class="info-val" style="color: ${color};">${isReject ? 'REJECTED' : 'ACTIVE'}</span></div>
          </div>
          <a href="/" class="btn">Open Attendance Portal</a>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send(`<h3>Server Error: ${err.message}</h3>`);
  }
});

// GET /api/approval/:token
approvalRouter.get('/:token', (req, res) => {
  try {
    const { token } = req.params;
    const approvalReq = db.findApprovalRequestByToken(token);

    if (!approvalReq) {
      return res.status(404).json({ error: 'Invalid or expired approval token.' });
    }

    const employee = db.findEmployeeById(approvalReq.employee_id);

    return res.json({
      request: approvalReq,
      employee,
      isExpired: new Date(approvalReq.expires_at).getTime() < Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to look up approval request.' });
  }
});

// POST /api/approval/:token/activate
approvalRouter.post('/:token/activate', (req, res) => {
  try {
    const { token } = req.params;
    const result = db.processApproval(token, 'ACTIVATE');

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process driver activation.' });
  }
});

// POST /api/approval/:token/reject
approvalRouter.post('/:token/reject', (req, res) => {
  try {
    const { token } = req.params;
    const result = db.processApproval(token, 'REJECT');

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process driver rejection.' });
  }
});
