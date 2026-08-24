import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // If driver, check approval and account status
    let employee = null;
    if (user.role === 'DRIVER' && user.employee_id) {
      employee = db.findEmployeeById(user.employee_id);
      if (!employee) {
        return res.status(403).json({ error: 'Driver employee profile was not found.' });
      }

      if (employee.approval_status === 'PENDING') {
        return res.status(403).json({
          error: 'Your account is awaiting approval from the higher authority.',
          code: 'PENDING_APPROVAL',
        });
      }

      if (employee.approval_status === 'REJECTED') {
        return res.status(403).json({
          error: 'Your account registration was not approved.',
          code: 'REJECTED',
        });
      }

      if (!employee.active || employee.account_status !== 'ACTIVE') {
        return res.status(403).json({
          error: 'Your account is currently inactive. Please contact your administrator.',
          code: 'INACTIVE',
        });
      }
    }

    db.updateUserLastLogin(user.id);
    if (employee) {
      db.updateEmployee(employee.id, { last_login_at: new Date().toISOString() });
    }

    db.addAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'USER_LOGIN',
      entity_type: 'USER',
      entity_id: user.id,
      description: `User ${user.username} (${user.role}) logged in successfully`,
      ip_address: req.ip,
      device_information: req.headers['user-agent'],
    });

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      employee,
    };

    return res.json({
      success: true,
      message: 'Login successful',
      user: sanitizedUser,
      token: `auth-token-${user.id}-${Date.now()}`,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login. Please try again.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = db.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let employee = null;
  if (user.employee_id) {
    employee = db.findEmployeeById(user.employee_id);
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      employee,
    },
  });
});

// POST /api/profile/change-password
authRouter.post('/change-password', (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash || '');
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.updateUserPassword(user.id, newHash);

    db.addAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'PASSWORD_CHANGED',
      entity_type: 'USER',
      entity_id: user.id,
      description: `User ${user.username} updated their own password`,
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});
