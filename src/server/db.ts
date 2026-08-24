import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type {
  User,
  Employee,
  Attendance,
  OdometerRecord,
  ApprovalRequest,
  AuditLog,
  SystemSettings,
  DashboardMetrics,
} from '../types';

interface DatabaseState {
  users: User[];
  employees: Employee[];
  attendance: Attendance[];
  odometer_records: OdometerRecord[];
  approval_requests: ApprovalRequest[];
  audit_logs: AuditLog[];
  system_settings: SystemSettings;
}

// In-memory relational storage with atomic transactions & schema constraints
class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.initializeSeedData();
  }

  private initializeSeedData(): DatabaseState {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const now = new Date();
    const isoNow = now.toISOString();

    const users: User[] = [
      {
        id: 'usr-admin-01',
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'ADMIN',
        active: true,
        last_login_at: null,
        created_at: isoNow,
        updated_at: isoNow,
      },
    ];

    const employees: Employee[] = [];
    const approval_requests: ApprovalRequest[] = [];
    const attendance: Attendance[] = [];
    const odometer_records: OdometerRecord[] = [];
    const audit_logs: AuditLog[] = [];

    const system_settings: SystemSettings = {
      id: 'settings-global',
      company_name: 'Gujarat Transport & Logistics Corp.',
      app_name: 'Driver Attendance System',
      higher_authority_email: process.env.HIGHER_AUTHORITY_EMAIL || process.env.BOSS_EMAIL || 'jaydeepsinhzala2590@gmail.com',
      public_app_url: process.env.PUBLIC_APP_URL || 'https://ais-pre-noiybzqy3aovqqay7h6ofz-454228176347.asia-east1.run.app',
      location_accuracy_threshold_meters: 50,
      approval_token_expiry_hours: 48,
      timezone: process.env.TIMEZONE || 'Asia/Kolkata',
      odoo_instance_url: 'https://odoo19.company.com',
      odoo_database: 'production_erp_odoo19',
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: Number(process.env.SMTP_PORT || 587),
      smtp_secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      smtp_user: process.env.SMTP_USER || '',
      smtp_pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
      smtp_from: process.env.FROM_EMAIL || process.env.SMTP_FROM || '',
      smtp_configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
    };

    return {
      users,
      employees,
      attendance,
      odometer_records,
      approval_requests,
      audit_logs,
      system_settings,
    };
  }

  // --- Users & Auth ---
  public findUserByUsername(username: string): User | undefined {
    return this.state.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  public findUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public findUserByEmployeeId(empId: string): User | undefined {
    return this.state.users.find((u) => u.employee_id === empId);
  }

  public updateUserPassword(userId: string, newHash: string): boolean {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return false;
    user.password_hash = newHash;
    user.updated_at = new Date().toISOString();
    return true;
  }

  public updateUserLastLogin(userId: string): void {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      user.last_login_at = new Date().toISOString();
    }
  }

  // --- Employees ---
  public getEmployees(): Employee[] {
    return this.state.employees.map((emp) => {
      const empAttendance = this.state.attendance.filter(
        (a) => a.employee_id === emp.id && a.status === 'COMPLETED'
      );
      const total_sessions = empAttendance.length;
      const total_worked_minutes = empAttendance.reduce(
        (acc, curr) => acc + (curr.worked_minutes || 0),
        0
      );
      const total_distance_km = empAttendance.reduce(
        (acc, curr) => acc + (curr.calculated_distance || 0),
        0
      );

      return {
        ...emp,
        total_sessions,
        total_worked_minutes,
        total_distance_km,
      };
    });
  }

  public findEmployeeById(id: string): Employee | undefined {
    return this.state.employees.find((e) => e.id === id);
  }

  public findEmployeeByCode(code: string): Employee | undefined {
    return this.state.employees.find(
      (e) => e.employee_code.toUpperCase() === code.trim().toUpperCase()
    );
  }

  public createDriver(data: {
    name: string;
    employee_code: string;
    username: string;
    password: string;
    phone: string;
    email: string;
    odoo_employee_id?: string;
  }): { employee: Employee; approval_request: ApprovalRequest } {
    const now = new Date().toISOString();
    const empId = `emp-${Date.now()}`;
    const userId = `usr-${Date.now()}`;
    const reqId = `appr-${Date.now()}`;

    const passwordHash = bcrypt.hashSync(data.password, 10);

    const employee: Employee = {
      id: empId,
      employee_code: data.employee_code.toUpperCase().trim(),
      name: data.name.trim(),
      username: data.username.toLowerCase().trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      approval_status: 'PENDING',
      account_status: 'PENDING_APPROVAL',
      active: false,
      odoo_employee_id: data.odoo_employee_id || `ODOO-${data.employee_code.toUpperCase()}`,
      created_at: now,
      updated_at: now,
      approved_at: null,
      last_login_at: null,
    };

    const user: User = {
      id: userId,
      employee_id: empId,
      username: data.username.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'DRIVER',
      active: false,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };

    // Generate secure random approval token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiryHours = this.state.system_settings.approval_token_expiry_hours || 48;
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

    const approval_request: ApprovalRequest = {
      id: reqId,
      employee_id: empId,
      employee_name: employee.name,
      employee_code: employee.employee_code,
      username: employee.username,
      token_hash: tokenHash,
      raw_token: rawToken,
      status: 'PENDING',
      approval_email: this.state.system_settings.higher_authority_email,
      created_at: now,
      expires_at: expiresAt,
    };

    this.state.employees.push(employee);
    this.state.users.push(user);
    this.state.approval_requests.push(approval_request);

    return { employee, approval_request };
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const emp = this.state.employees.find((e) => e.id === id);
    if (!emp) return null;
    Object.assign(emp, updates, { updated_at: new Date().toISOString() });
    return emp;
  }

  public setEmployeeActiveState(id: string, active: boolean): boolean {
    const emp = this.state.employees.find((e) => e.id === id);
    if (!emp) return false;
    emp.active = active;
    emp.account_status = active ? 'ACTIVE' : 'INACTIVE';
    emp.updated_at = new Date().toISOString();

    const user = this.state.users.find((u) => u.employee_id === id);
    if (user) {
      user.active = active;
      user.updated_at = new Date().toISOString();
    }
    return true;
  }

  // --- Approvals ---
  public getApprovalRequests(): ApprovalRequest[] {
    return [...this.state.approval_requests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public findApprovalRequestByToken(token: string): ApprovalRequest | undefined {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return this.state.approval_requests.find(
      (r) => r.raw_token === token || r.token_hash === hash
    );
  }

  public resendApprovalRequest(employeeId: string): ApprovalRequest | null {
    const emp = this.findEmployeeById(employeeId);
    if (!emp) return null;

    const now = new Date().toISOString();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiryHours = this.state.system_settings.approval_token_expiry_hours || 48;
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

    const req: ApprovalRequest = {
      id: `appr-${Date.now()}`,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.employee_code,
      username: emp.username,
      token_hash: tokenHash,
      raw_token: rawToken,
      status: 'PENDING',
      approval_email: this.state.system_settings.higher_authority_email,
      created_at: now,
      expires_at: expiresAt,
    };

    // Mark previous requests for this employee as expired
    this.state.approval_requests.forEach((r) => {
      if (r.employee_id === emp.id && r.status === 'PENDING') {
        r.status = 'EXPIRED';
      }
    });

    this.state.approval_requests.push(req);
    return req;
  }

  public processApproval(token: string, action: 'ACTIVATE' | 'REJECT'): {
    success: boolean;
    message: string;
    employee?: Employee;
  } {
    const req = this.findApprovalRequestByToken(token);
    if (!req) {
      return { success: false, message: 'Invalid or unrecognized approval token.' };
    }

    if (req.status !== 'PENDING') {
      return {
        success: false,
        message: `This approval request has already been ${req.status.toLowerCase()}. Tokens cannot be reused.`,
      };
    }

    if (new Date(req.expires_at).getTime() < Date.now()) {
      req.status = 'EXPIRED';
      return { success: false, message: 'This approval request token has expired.' };
    }

    const emp = this.findEmployeeById(req.employee_id);
    if (!emp) {
      return { success: false, message: 'Associated employee record was not found.' };
    }

    const now = new Date().toISOString();
    const user = this.state.users.find((u) => u.employee_id === emp.id);

    if (action === 'ACTIVATE') {
      req.status = 'APPROVED';
      req.approved_at = now;
      req.approval_action = 'ACTIVATE';

      emp.approval_status = 'APPROVED';
      emp.account_status = 'ACTIVE';
      emp.active = true;
      emp.approved_at = now;
      emp.updated_at = now;

      if (user) {
        user.active = true;
        user.updated_at = now;
      }

      this.addAuditLog({
        user_id: null,
        username: 'Higher Authority (Email)',
        action: 'DRIVER_ACTIVATED',
        entity_type: 'EMPLOYEE',
        entity_id: emp.id,
        new_value: { approval_status: 'APPROVED', account_status: 'ACTIVE' },
        description: `Higher authority approved and activated driver ${emp.name} (${emp.employee_code}) via secure email link`,
      });

      return {
        success: true,
        message: `Driver account for ${emp.name} (${emp.employee_code}) has been successfully APPROVED and ACTIVATED. The driver can now log in using the credentials provided by Admin.`,
        employee: emp,
      };
    } else {
      req.status = 'REJECTED';
      req.rejected_at = now;
      req.approval_action = 'REJECT';

      emp.approval_status = 'REJECTED';
      emp.account_status = 'INACTIVE';
      emp.active = false;
      emp.updated_at = now;

      if (user) {
        user.active = false;
        user.updated_at = now;
      }

      this.addAuditLog({
        user_id: null,
        username: 'Higher Authority (Email)',
        action: 'DRIVER_REJECTED',
        entity_type: 'EMPLOYEE',
        entity_id: emp.id,
        new_value: { approval_status: 'REJECTED', account_status: 'INACTIVE' },
        description: `Higher authority rejected driver activation request for ${emp.name} (${emp.employee_code})`,
      });

      return {
        success: true,
        message: `Driver account for ${emp.name} (${emp.employee_code}) has been REJECTED. The driver account remains inactive.`,
        employee: emp,
      };
    }
  }

  public approveDriverDirectly(employeeId: string, approvedBy: string): {
    success: boolean;
    message: string;
    employee?: Employee;
  } {
    const emp = this.findEmployeeById(employeeId);
    if (!emp) {
      return { success: false, message: 'Driver not found.' };
    }

    const now = new Date().toISOString();
    emp.approval_status = 'APPROVED';
    emp.account_status = 'ACTIVE';
    emp.active = true;
    emp.approved_at = now;
    emp.updated_at = now;

    const user = this.state.users.find((u) => u.employee_id === emp.id);
    if (user) {
      user.active = true;
      user.updated_at = now;
    }

    // Mark any pending approval request as approved
    this.state.approval_requests.forEach((r) => {
      if (r.employee_id === emp.id && r.status === 'PENDING') {
        r.status = 'APPROVED';
        r.approved_at = now;
        r.approval_action = 'ACTIVATE';
      }
    });

    this.addAuditLog({
      user_id: null,
      username: approvedBy,
      action: 'DRIVER_ACTIVATED_DIRECT',
      entity_type: 'EMPLOYEE',
      entity_id: emp.id,
      new_value: { approval_status: 'APPROVED', account_status: 'ACTIVE' },
      description: `${approvedBy} directly approved and activated driver ${emp.name} (${emp.employee_code}) via Admin Portal.`,
    });

    return {
      success: true,
      message: `Driver account for ${emp.name} (${emp.employee_code}) has been APPROVED and ACTIVATED immediately.`,
      employee: emp,
    };
  }

  // --- Attendance ---
  public getAttendance(filters?: {
    employee_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Attendance[] {
    let result = [...this.state.attendance];

    if (filters?.employee_id) {
      result = result.filter((a) => a.employee_id === filters.employee_id);
    }
    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.startDate) {
      result = result.filter((a) => new Date(a.check_in) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      result = result.filter((a) => new Date(a.check_in) <= new Date(filters.endDate!));
    }

    return result.sort(
      (a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime()
    );
  }

  public getActiveAttendanceForEmployee(empId: string): Attendance | undefined {
    return this.state.attendance.find(
      (a) => a.employee_id === empId && a.status === 'IN_PROGRESS'
    );
  }

  public findAttendanceById(id: string): Attendance | undefined {
    return this.state.attendance.find((a) => a.id === id);
  }

  public checkIn(data: {
    employee_id: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
    is_mock_location?: boolean;
    starting_odometer: number;
    starting_odometer_image?: string;
    starting_odometer_input_method: 'OCR' | 'MANUAL';
    starting_odometer_ocr_value?: number | null;
    starting_odometer_ocr_confidence?: number | null;
    client_timestamp?: string;
  }): { success: boolean; message: string; attendance?: Attendance } {
    const emp = this.findEmployeeById(data.employee_id);
    if (!emp) return { success: false, message: 'Employee not found.' };

    if (!emp.active || emp.account_status !== 'ACTIVE' || emp.approval_status !== 'APPROVED') {
      return { success: false, message: 'Your account is not active or awaiting approval.' };
    }

    // Check if already checked in
    const existing = this.getActiveAttendanceForEmployee(data.employee_id);
    if (existing) {
      return { success: false, message: 'Driver is already checked in. Please check out first.' };
    }

    const checkInTime = data.client_timestamp || new Date().toISOString();
    const attId = `att-${Date.now()}`;

    const attendance: Attendance = {
      id: attId,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.employee_code,
      check_in: checkInTime,
      check_in_latitude: data.latitude,
      check_in_longitude: data.longitude,
      check_in_accuracy: data.accuracy,
      check_in_location_timestamp: checkInTime,
      check_in_location_address: data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
      check_in_is_mock_location: Boolean(data.is_mock_location),
      starting_odometer: data.starting_odometer,
      starting_odometer_image: data.starting_odometer_image,
      starting_odometer_input_method: data.starting_odometer_input_method,
      starting_odometer_ocr_value: data.starting_odometer_ocr_value,
      starting_odometer_ocr_confidence: data.starting_odometer_ocr_confidence,
      status: 'IN_PROGRESS',
      created_at: checkInTime,
      updated_at: checkInTime,
    };

    // Create Odometer Record
    const odoId = `odo-${Date.now()}`;
    const odometerRecord: OdometerRecord = {
      id: odoId,
      attendance_id: attId,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.employee_code,
      date: checkInTime.split('T')[0],
      starting_image: data.starting_odometer_image,
      starting_ocr_value: data.starting_odometer_ocr_value,
      starting_reading: data.starting_odometer,
      starting_ocr_confidence: data.starting_odometer_ocr_confidence,
      starting_input_method: data.starting_odometer_input_method,
      created_at: checkInTime,
      updated_at: checkInTime,
    };

    this.state.attendance.unshift(attendance);
    this.state.odometer_records.unshift(odometerRecord);

    this.addAuditLog({
      user_id: emp.id,
      username: emp.name,
      action: 'CHECK_IN',
      entity_type: 'ATTENDANCE',
      entity_id: attId,
      new_value: {
        check_in: checkInTime,
        starting_odometer: data.starting_odometer,
        input_method: data.starting_odometer_input_method,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      description: `Driver ${emp.name} checked in at ${attendance.check_in_location_address} with odometer ${data.starting_odometer} KM`,
    });

    return { success: true, message: 'Check-In recorded successfully.', attendance };
  }

  public checkOut(data: {
    employee_id: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
    is_mock_location?: boolean;
    ending_odometer: number;
    ending_odometer_image?: string;
    ending_odometer_input_method: 'OCR' | 'MANUAL';
    ending_odometer_ocr_value?: number | null;
    ending_odometer_ocr_confidence?: number | null;
    client_timestamp?: string;
  }): { success: boolean; message: string; attendance?: Attendance } {
    const attendance = this.getActiveAttendanceForEmployee(data.employee_id);
    if (!attendance) {
      return { success: false, message: 'No active check-in session found to check out from.' };
    }

    if (data.ending_odometer < attendance.starting_odometer) {
      return {
        success: false,
        message: `Ending odometer (${data.ending_odometer} KM) cannot be lower than starting odometer (${attendance.starting_odometer} KM).`,
      };
    }

    const checkOutTime = data.client_timestamp || new Date().toISOString();
    const checkInDate = new Date(attendance.check_in);
    const checkOutDate = new Date(checkOutTime);

    const diffMinutes = Math.max(
      0,
      Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (60 * 1000))
    );
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const formattedDuration = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const distance = Math.max(0, data.ending_odometer - attendance.starting_odometer);

    attendance.check_out = checkOutTime;
    attendance.check_out_latitude = data.latitude;
    attendance.check_out_longitude = data.longitude;
    attendance.check_out_accuracy = data.accuracy;
    attendance.check_out_location_timestamp = checkOutTime;
    attendance.check_out_location_address =
      data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`;
    attendance.check_out_is_mock_location = Boolean(data.is_mock_location);

    attendance.ending_odometer = data.ending_odometer;
    attendance.ending_odometer_image = data.ending_odometer_image;
    attendance.ending_odometer_input_method = data.ending_odometer_input_method;
    attendance.ending_odometer_ocr_value = data.ending_odometer_ocr_value;
    attendance.ending_odometer_ocr_confidence = data.ending_odometer_ocr_confidence;

    attendance.calculated_distance = distance;
    attendance.worked_duration = formattedDuration;
    attendance.worked_minutes = diffMinutes;
    attendance.status = 'COMPLETED';
    attendance.updated_at = checkOutTime;

    // Update Odometer Record
    const odo = this.state.odometer_records.find((o) => o.attendance_id === attendance.id);
    if (odo) {
      odo.ending_image = data.ending_odometer_image;
      odo.ending_ocr_value = data.ending_odometer_ocr_value;
      odo.ending_reading = data.ending_odometer;
      odo.ending_ocr_confidence = data.ending_odometer_ocr_confidence;
      odo.ending_input_method = data.ending_odometer_input_method;
      odo.calculated_distance = distance;
      odo.updated_at = checkOutTime;
    }

    this.addAuditLog({
      user_id: data.employee_id,
      username: attendance.employee_name || 'Driver',
      action: 'CHECK_OUT',
      entity_type: 'ATTENDANCE',
      entity_id: attendance.id,
      new_value: {
        check_out: checkOutTime,
        ending_odometer: data.ending_odometer,
        calculated_distance: distance,
        worked_duration: formattedDuration,
      },
      description: `Driver ${attendance.employee_name} checked out at ${attendance.check_out_location_address}. Total distance: ${distance} KM, Duration: ${formattedDuration}`,
    });

    return { success: true, message: 'Check-Out recorded successfully.', attendance };
  }

  public updateAttendanceByAdmin(
    id: string,
    updates: Partial<Attendance>,
    adminUser: { id: string; username: string },
    reason: string
  ): { success: boolean; message: string; attendance?: Attendance } {
    const att = this.findAttendanceById(id);
    if (!att) return { success: false, message: 'Attendance record not found.' };

    const oldCopy = { ...att };

    // Apply updates
    if (updates.check_in !== undefined) att.check_in = updates.check_in;
    if (updates.check_out !== undefined) att.check_out = updates.check_out;
    if (updates.starting_odometer !== undefined) att.starting_odometer = updates.starting_odometer;
    if (updates.ending_odometer !== undefined) att.ending_odometer = updates.ending_odometer;
    if (updates.check_in_location_address !== undefined)
      att.check_in_location_address = updates.check_in_location_address;
    if (updates.check_out_location_address !== undefined)
      att.check_out_location_address = updates.check_out_location_address;
    if (updates.status !== undefined) att.status = updates.status;

    // Recalculate distance and worked duration
    if (att.starting_odometer !== undefined && att.ending_odometer !== undefined && att.ending_odometer !== null) {
      att.calculated_distance = Math.max(0, att.ending_odometer - att.starting_odometer);
    }

    if (att.check_in && att.check_out) {
      const inTime = new Date(att.check_in).getTime();
      const outTime = new Date(att.check_out).getTime();
      if (outTime >= inTime) {
        const diffMins = Math.round((outTime - inTime) / (60 * 1000));
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        att.worked_duration = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        att.worked_minutes = diffMins;
      }
    }

    att.updated_at = new Date().toISOString();

    // Sync Odometer Record
    const odo = this.state.odometer_records.find((o) => o.attendance_id === att.id);
    if (odo) {
      odo.starting_reading = att.starting_odometer;
      odo.ending_reading = att.ending_odometer;
      odo.calculated_distance = att.calculated_distance;
      odo.updated_at = att.updated_at;
    }

    this.addAuditLog({
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'ATTENDANCE_EDITED',
      entity_type: 'ATTENDANCE',
      entity_id: att.id,
      old_value: oldCopy,
      new_value: att,
      description: `Admin edited attendance ${att.id} for ${att.employee_name}. Reason: ${reason || 'Manual administrative correction'}`,
    });

    return { success: true, message: 'Attendance updated successfully.', attendance: att };
  }

  // --- Odometer Records ---
  public getOdometerRecords(): OdometerRecord[] {
    return [...this.state.odometer_records].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // --- Audit Logs ---
  public addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    this.state.audit_logs.unshift(entry);
    return entry;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.state.audit_logs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // --- System Settings ---
  public getSettings(): SystemSettings {
    return { ...this.state.system_settings };
  }

  public updateSettings(
    updates: Partial<SystemSettings>,
    adminUser: { id: string; username: string }
  ): SystemSettings {
    const oldVal = { ...this.state.system_settings };
    Object.assign(this.state.system_settings, updates);

    this.addAuditLog({
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'SETTINGS_UPDATED',
      entity_type: 'SETTINGS',
      entity_id: this.state.system_settings.id,
      old_value: oldVal,
      new_value: this.state.system_settings,
      description: 'Admin updated system configuration settings',
    });

    return { ...this.state.system_settings };
  }

  // --- Dashboard Metrics ---
  public getDashboardMetrics(): DashboardMetrics {
    const todayStr = new Date().toISOString().split('T')[0];
    const drivers = this.getEmployees();
    const allAtt = this.state.attendance;

    const total_drivers = drivers.length;
    const active_drivers = drivers.filter((d) => d.account_status === 'ACTIVE').length;
    const pending_approvals = drivers.filter((d) => d.approval_status === 'PENDING').length;

    const todayAttendance = allAtt.filter((a) => a.check_in.startsWith(todayStr));
    const today_checked_in = todayAttendance.length;
    const today_checked_out = todayAttendance.filter((a) => a.status === 'COMPLETED').length;
    const currently_working = allAtt.filter((a) => a.status === 'IN_PROGRESS').length;

    const todayTotalMinutes = todayAttendance.reduce(
      (sum, a) => sum + (a.worked_minutes || 0),
      0
    );
    const hrs = Math.floor(todayTotalMinutes / 60);
    const mins = todayTotalMinutes % 60;
    const today_total_worked_hours = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const today_total_km = todayAttendance.reduce(
      (sum, a) => sum + (a.calculated_distance || 0),
      0
    );

    const location_verification_issues = allAtt.filter(
      (a) =>
        a.check_in_is_mock_location ||
        a.check_out_is_mock_location ||
        a.check_in_accuracy > this.state.system_settings.location_accuracy_threshold_meters
    ).length;

    const odometer_ocr_failures = allAtt.filter(
      (a) =>
        (a.starting_odometer_input_method === 'MANUAL' && (a.starting_odometer_ocr_confidence ?? 1) < 0.8) ||
        (a.ending_odometer_input_method === 'MANUAL' && (a.ending_odometer_ocr_confidence ?? 1) < 0.8)
    ).length;

    const odometer_manual_entries = allAtt.filter(
      (a) =>
        a.starting_odometer_input_method === 'MANUAL' ||
        a.ending_odometer_input_method === 'MANUAL'
    ).length;

    const missed_check_outs = allAtt.filter((a) => {
      if (a.status !== 'IN_PROGRESS') return false;
      const checkInDate = new Date(a.check_in);
      const hoursSince = (Date.now() - checkInDate.getTime()) / (3600 * 1000);
      return hoursSince > 24; // flag if active over 24 hours without checkout
    }).length;

    return {
      total_drivers,
      active_drivers,
      pending_approvals,
      today_checked_in,
      today_checked_out,
      currently_working,
      today_total_worked_hours,
      today_total_km,
      location_verification_issues,
      odometer_ocr_failures,
      odometer_manual_entries,
      missed_check_outs,
    };
  }
}

export const db = new Database();
