import { Router } from 'express';
import { db } from '../db';
import type { OdooExportValidationResult, Attendance } from '../../types';

export const exportRouter = Router();

// Helper to format ISO date to Odoo 19 standard "YYYY-MM-DD HH:mm:ss" in specified timezone
function formatOdooDateTime(isoString?: string | null, _timezone = 'Asia/Kolkata'): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  // In standard UTC+05:30 for Asia/Kolkata
  const offsetMs = 5.5 * 60 * 60 * 1000;
  const localDate = new Date(date.getTime() + offsetMs);

  const yyyy = localDate.getUTCFullYear();
  const mm = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getUTCDate()).padStart(2, '0');
  const hh = String(localDate.getUTCHours()).padStart(2, '0');
  const min = String(localDate.getUTCMinutes()).padStart(2, '0');
  const ss = String(localDate.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// GET /api/admin/export/odoo19-validate
exportRouter.get('/odoo19-validate', (req, res) => {
  try {
    const { startDate, endDate, employee_id } = req.query as Record<string, string>;
    const attendances = db.getAttendance({ startDate, endDate, employee_id });
    const employees = db.getEmployees();
    const settings = db.getSettings();

    const empMap = new Map(employees.map((e) => [e.id, e]));

    let readyCount = 0;
    let errorCount = 0;

    const items = attendances.map((att) => {
      const emp = empMap.get(att.employee_id);
      const errors: string[] = [];

      if (!emp) {
        errors.push('Employee record not found in system.');
      } else if (!emp.odoo_employee_id) {
        errors.push('Missing Odoo Employee ID mapping.');
      }

      if (!att.check_in) {
        errors.push('Missing Check-In timestamp.');
      }

      if (!att.check_out && att.status === 'IN_PROGRESS') {
        errors.push('Session still in progress (Missing Check-Out).');
      }

      if (att.check_in && att.check_out) {
        const inTime = new Date(att.check_in).getTime();
        const outTime = new Date(att.check_out).getTime();
        if (outTime < inTime) {
          errors.push('Check-Out time is earlier than Check-In time.');
        }
      }

      const isValid = errors.length === 0;
      if (isValid) readyCount++;
      else errorCount++;

      return {
        attendance_id: att.id,
        employee_code: att.employee_code || emp?.employee_code || 'UNKNOWN',
        employee_name: att.employee_name || emp?.name || 'Unknown',
        odoo_employee_id: emp?.odoo_employee_id || null,
        check_in: att.check_in,
        check_out: att.check_out || null,
        is_valid: isValid,
        validation_errors: errors,
        formatted_check_in: formatOdooDateTime(att.check_in, settings.timezone),
        formatted_check_out: formatOdooDateTime(att.check_out, settings.timezone),
      };
    });

    const result: OdooExportValidationResult = {
      total_records: attendances.length,
      ready_records: readyCount,
      error_records: errorCount,
      items,
    };

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to validate Odoo export records.' });
  }
});

// GET /api/admin/export/odoo19-csv
exportRouter.get('/odoo19-csv', (req, res) => {
  try {
    const { startDate, endDate, employee_id, validOnly = 'true' } = req.query as Record<string, string>;
    const attendances = db.getAttendance({ startDate, endDate, employee_id });
    const employees = db.getEmployees();
    const settings = db.getSettings();
    const empMap = new Map(employees.map((e) => [e.id, e]));

    // Odoo 19 Attendance official columns
    const headers = ['Employee', 'Employee/External ID', 'Check In', 'Check Out'];
    const rows: string[] = [headers.join(',')];

    for (const att of attendances) {
      const emp = empMap.get(att.employee_id);
      const isComplete = Boolean(att.check_in && att.check_out);

      if (validOnly === 'true' && (!isComplete || !emp?.odoo_employee_id)) {
        continue;
      }

      const employeeName = `"${(emp?.name || att.employee_name || '').replace(/"/g, '""')}"`;
      const odooId = `"${(emp?.odoo_employee_id || emp?.employee_code || '').replace(/"/g, '""')}"`;
      const formattedCheckIn = `"${formatOdooDateTime(att.check_in, settings.timezone)}"`;
      const formattedCheckOut = `"${formatOdooDateTime(att.check_out, settings.timezone)}"`;

      rows.push([employeeName, odooId, formattedCheckIn, formattedCheckOut].join(','));
    }

    const csvContent = rows.join('\n');
    const filename = `odoo19_attendance_${new Date().toISOString().split('T')[0]}.csv`;

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: 'EXPORT_ODOO_19',
      entity_type: 'EXPORT',
      description: `Admin exported Odoo 19 attendance CSV file (${rows.length - 1} records)`,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate Odoo 19 CSV.' });
  }
});

// GET /api/admin/export/attendance-csv (Full Attendance Data)
exportRouter.get('/attendance-csv', (req, res) => {
  try {
    const { startDate, endDate, employee_id } = req.query as Record<string, string>;
    const attendances = db.getAttendance({ startDate, endDate, employee_id });
    const settings = db.getSettings();

    const headers = [
      'Record ID',
      'Employee Code',
      'Employee Name',
      'Status',
      'Check In Time',
      'Check In Latitude',
      'Check In Longitude',
      'Check In Accuracy (m)',
      'Check In Address',
      'Starting Odometer (KM)',
      'Starting Input Method',
      'Check Out Time',
      'Check Out Latitude',
      'Check Out Longitude',
      'Check Out Accuracy (m)',
      'Check Out Address',
      'Ending Odometer (KM)',
      'Ending Input Method',
      'Total Distance (KM)',
      'Worked Duration (HH:MM)',
    ];

    const rows: string[] = [headers.join(',')];

    for (const att of attendances) {
      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      rows.push([
        escape(att.id),
        escape(att.employee_code),
        escape(att.employee_name),
        escape(att.status),
        escape(formatOdooDateTime(att.check_in, settings.timezone)),
        escape(att.check_in_latitude),
        escape(att.check_in_longitude),
        escape(att.check_in_accuracy),
        escape(att.check_in_location_address),
        escape(att.starting_odometer),
        escape(att.starting_odometer_input_method),
        escape(formatOdooDateTime(att.check_out, settings.timezone)),
        escape(att.check_out_latitude || ''),
        escape(att.check_out_longitude || ''),
        escape(att.check_out_accuracy || ''),
        escape(att.check_out_location_address || ''),
        escape(att.ending_odometer || ''),
        escape(att.ending_odometer_input_method || ''),
        escape(att.calculated_distance || 0),
        escape(att.worked_duration || '00:00'),
      ].join(','));
    }

    const csvContent = rows.join('\n');
    const filename = `driver_attendance_full_${new Date().toISOString().split('T')[0]}.csv`;

    const adminUser = (req.headers['x-admin-name'] as string) || 'Admin';
    db.addAuditLog({
      username: adminUser,
      action: 'EXPORT_FULL_ATTENDANCE',
      entity_type: 'EXPORT',
      description: `Admin exported full attendance CSV dataset (${attendances.length} records)`,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate attendance CSV export.' });
  }
});
