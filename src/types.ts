export type Role = 'ADMIN' | 'DRIVER';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AccountStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';

export type AttendanceStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type OdometerInputMethod = 'OCR' | 'MANUAL';

export interface User {
  id: string;
  employee_id?: string | null;
  username: string;
  password_hash?: string;
  role: Role;
  active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  approval_status: ApprovalStatus;
  account_status: AccountStatus;
  active: boolean;
  odoo_employee_id?: string | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  last_login_at?: string | null;
  // Stats aggregated
  total_sessions?: number;
  total_worked_minutes?: number;
  total_distance_km?: number;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;

  // Check-In Details
  check_in: string; // ISO 8601 string
  check_in_latitude: number;
  check_in_longitude: number;
  check_in_accuracy: number; // in meters
  check_in_location_timestamp: string;
  check_in_location_address: string;
  check_in_is_mock_location: boolean;

  // Starting Odometer
  starting_odometer: number;
  starting_odometer_image?: string; // base64 or secure image URL
  starting_odometer_input_method: OdometerInputMethod;
  starting_odometer_ocr_value?: number | null;
  starting_odometer_ocr_confidence?: number | null;

  // Check-Out Details
  check_out?: string | null; // ISO 8601 string
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  check_out_accuracy?: number | null;
  check_out_location_timestamp?: string | null;
  check_out_location_address?: string | null;
  check_out_is_mock_location?: boolean;

  // Ending Odometer
  ending_odometer?: number | null;
  ending_odometer_image?: string | null;
  ending_odometer_input_method?: OdometerInputMethod | null;
  ending_odometer_ocr_value?: number | null;
  ending_odometer_ocr_confidence?: number | null;

  // Computed Values
  calculated_distance?: number | null; // in km
  worked_duration?: string | null; // e.g. "08:13"
  worked_minutes?: number | null;

  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface OdometerRecord {
  id: string;
  attendance_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  date: string;

  starting_image?: string;
  starting_ocr_value?: number | null;
  starting_reading: number;
  starting_ocr_confidence?: number | null;
  starting_input_method: OdometerInputMethod;

  ending_image?: string | null;
  ending_ocr_value?: number | null;
  ending_reading?: number | null;
  ending_ocr_confidence?: number | null;
  ending_input_method?: OdometerInputMethod | null;

  calculated_distance?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  username?: string;
  token_hash: string;
  raw_token: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approval_email: string;
  approval_action?: 'ACTIVATE' | 'REJECT' | null;
  created_at: string;
  expires_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  username: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  description: string;
  created_at: string;
  ip_address?: string;
  device_information?: string;
}

export interface SystemSettings {
  id: string;
  company_name: string;
  app_name: string;
  higher_authority_email: string;
  public_app_url?: string;
  location_accuracy_threshold_meters: number;
  approval_token_expiry_hours: number;
  timezone: string;
  odoo_instance_url: string;
  odoo_database: string;
  // SMTP & API Email Server Settings
  email_provider?: 'smtp' | 'resend' | 'brevo_api' | 'sendgrid_api';
  email_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
  smtp_configured?: boolean;
}

export interface DashboardMetrics {
  total_drivers: number;
  active_drivers: number;
  pending_approvals: number;
  today_checked_in: number;
  today_checked_out: number;
  currently_working: number;
  today_total_worked_hours: string;
  today_total_km: number;
  location_verification_issues: number;
  odometer_ocr_failures: number;
  odometer_manual_entries: number;
  missed_check_outs: number;
}

export interface OdooExportValidationResult {
  total_records: number;
  ready_records: number;
  error_records: number;
  items: Array<{
    attendance_id: string;
    employee_code: string;
    employee_name: string;
    odoo_employee_id?: string | null;
    check_in: string;
    check_out?: string | null;
    is_valid: boolean;
    validation_errors: string[];
    formatted_check_in: string;
    formatted_check_out: string;
  }>;
}

export interface LocationCaptureData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address: string;
  is_mock_location: boolean;
}

export interface OfflinePendingAttendance {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  attendance_id?: string;
  timestamp: string;
  location: LocationCaptureData;
  odometer: {
    reading: number;
    image?: string;
    input_method: OdometerInputMethod;
    ocr_value?: number | null;
    ocr_confidence?: number | null;
  };
}
