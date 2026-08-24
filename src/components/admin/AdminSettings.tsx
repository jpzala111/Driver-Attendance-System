import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { SystemSettings } from '../../types';
import {
  Settings,
  Save,
  Mail,
  MapPin,
  Globe,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { showToast } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'settings-global',
    company_name: 'Gujarat Transport & Logistics Corp.',
    app_name: 'Driver Attendance System',
    higher_authority_email: 'jaydeepsinhzala2590@gmail.com',
    public_app_url: 'https://ais-pre-noiybzqy3aovqqay7h6ofz-454228176347.asia-east1.run.app',
    approval_token_expiry_hours: 48,
    location_accuracy_threshold_meters: 50,
    timezone: 'Asia/Kolkata',
    odoo_instance_url: 'https://odoo19.company.com',
    odoo_database: 'production_erp_odoo19',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_configured: false,
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Test Email state
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
          }));
        }
      }
    } catch {
      showToast('error', 'Error', 'Failed to load system configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (preset: 'gmail' | 'outlook' | 'sendgrid' | 'brevo' | 'custom') => {
    if (preset === 'gmail') {
      setSettings((prev) => ({
        ...prev,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_from: prev.smtp_from || `"Driver Portal" <${prev.smtp_user || 'your-email@gmail.com'}>`,
      }));
      showToast('info', 'Gmail Preset Applied', 'Use your full Gmail address and a 16-character Google App Password.');
    } else if (preset === 'outlook') {
      setSettings((prev) => ({
        ...prev,
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        smtp_secure: false,
      }));
      showToast('info', 'Outlook Preset Applied', 'Configured for Office 365 / Outlook SMTP.');
    } else if (preset === 'sendgrid') {
      setSettings((prev) => ({
        ...prev,
        smtp_host: 'smtp.sendgrid.net',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'apikey',
      }));
      showToast('info', 'SendGrid Preset Applied', 'Use "apikey" as username and your SendGrid API key as password.');
    } else if (preset === 'brevo') {
      setSettings((prev) => ({
        ...prev,
        smtp_host: 'smtp-relay.brevo.com',
        smtp_port: 587,
        smtp_secure: false,
      }));
      showToast('info', 'Brevo Preset Applied', 'Configured for Brevo (Sendinblue) SMTP.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestEmailResult(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Settings Saved', 'System configurations and email delivery settings updated.');
        if (data.settings) {
          setSettings(data.settings);
        }
      } else {
        showToast('error', 'Save Failed', data.error || 'Failed to update settings');
      }
    } catch {
      showToast('error', 'Error', 'Failed to reach server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.higher_authority_email) {
      showToast('error', 'Missing Boss Email', 'Please enter the Boss / Higher Authority email address.');
      return;
    }

    setIsTestingEmail(true);
    setTestEmailResult(null);

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-name': 'Admin',
        },
        body: JSON.stringify({
          toEmail: settings.higher_authority_email,
          customSettings: settings,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailResult({ success: true, message: data.message });
        showToast('success', 'Email Delivered', `Test email dispatched to ${settings.higher_authority_email}!`);
      } else {
        setTestEmailResult({ success: false, message: data.error || data.details || 'Failed to dispatch test email.' });
        showToast('error', 'Email Test Failed', data.error || 'Check your SMTP credentials.');
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: 'Network error or backend unreachable.' });
      showToast('error', 'Error', 'Network error connecting to email service.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100">System Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure real email delivery to your Boss, SMTP relay settings, GPS verification thresholds, and Odoo parameters.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Reload
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Boss Email & Approval Workflow */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
              <Mail className="w-4 h-4 text-indigo-400" /> Boss / Higher Authority Approver Email
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Primary Recipient
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Boss / Higher Authority Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={settings.higher_authority_email || ''}
                onChange={(e) => setSettings({ ...settings, higher_authority_email: e.target.value })}
                placeholder="e.g. boss@yourcompany.com or rtgpl2507@gmail.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                All driver activation tokens and verification emails will be sent directly to this address.
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Approval Token Expiry (Hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                value={settings.approval_token_expiry_hours || 48}
                onChange={(e) => setSettings({ ...settings, approval_token_expiry_hours: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">Cryptographic links automatically expire after this period.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">
                Public App URL for Email Approval Links
              </label>
              <input
                type="url"
                value={settings.public_app_url || 'https://ais-pre-noiybzqy3aovqqay7h6ofz-454228176347.asia-east1.run.app'}
                onChange={(e) => setSettings({ ...settings, public_app_url: e.target.value })}
                placeholder="https://ais-pre-noiybzqy3aovqqay7h6ofz-454228176347.asia-east1.run.app"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono transition-colors text-xs"
              />
              <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                This public shared URL allows your Boss to click and approve driver requests without encountering 403 Forbidden errors.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Real SMTP Email Server Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
              <Server className="w-4 h-4 text-emerald-400" /> Real SMTP Email Server Settings (Nodemailer)
            </div>
            <div className="flex items-center gap-2">
              {settings.smtp_host && settings.smtp_user ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> SMTP Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> SMTP Credentials Needed for Real Inbox Delivery
                </span>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-slate-400 text-[11px] font-medium block mb-2">
              Auto-Fill Provider Configuration Preset:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('gmail')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Gmail (smtp.gmail.com)
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('outlook')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Outlook / Office 365
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('sendgrid')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 font-medium transition-colors cursor-pointer"
              >
                SendGrid
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('brevo')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Brevo (Sendinblue)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-medium block mb-1">SMTP Server Host</label>
              <input
                type="text"
                value={settings.smtp_host || ''}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                placeholder="e.g. smtp.gmail.com or mail.yourcompany.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Port</label>
              <input
                type="number"
                value={settings.smtp_port || 587}
                onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value) })}
                placeholder="587 or 465"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-medium block mb-1">SMTP Username / Email Address</label>
              <input
                type="text"
                value={settings.smtp_user || ''}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                placeholder="e.g. notifications@yourcompany.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">SMTP Password / App Password</label>
                <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold" title="For Gmail, create a 16-character App Password under Google Account Security">
                  <HelpCircle className="w-3 h-3" />
                  <span>Google App Password Required</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.smtp_pass || ''}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  placeholder="16-character App Password (e.g. abcd efgh ijkl mnop)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-100 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Special Gmail / Google Workspace Setup Instructions */}
          {settings.smtp_host?.includes('gmail') && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-indigo-400" />
                How to fix "535 Username and Password not accepted" (Gmail):
              </div>
              <p className="text-slate-300 leading-relaxed">
                Google blocks regular Gmail passwords on SMTP for security. You must generate a free 16-character <strong>App Password</strong>:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                <li>
                  Open your <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold hover:text-indigo-300">Google Account Security Settings</a> and turn on <strong>2-Step Verification</strong>.
                </li>
                <li>
                  Go directly to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold hover:text-indigo-300">myaccount.google.com/apppasswords</a>.
                </li>
                <li>
                  Enter App name (e.g. <em>"Driver Portal"</em>) &rarr; Click <strong>Create</strong>.
                </li>
                <li>
                  Copy the <strong>16-character password</strong> (e.g. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">abcd efgh ijkl mnop</code>) and paste it into the <strong>SMTP Password</strong> field above.
                </li>
              </ol>
            </div>
          )}

          <div>
            <label className="text-slate-300 font-medium block mb-1">Sender Name &amp; From Header</label>
            <input
              type="text"
              value={settings.smtp_from || ''}
              onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
              placeholder='"Driver Portal" <no-reply@company.com>'
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Test Email Action Bar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-400" /> Test Delivery to Boss Email
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sends a live test verification email to: <span className="font-mono text-blue-400 font-bold">{settings.higher_authority_email || 'Not set'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isTestingEmail || !settings.higher_authority_email}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              {isTestingEmail ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testing SMTP...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Email to Boss</span>
                </>
              )}
            </button>
          </div>

          {/* Test Result Message Box */}
          {testEmailResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testEmailResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testEmailResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {testEmailResult.success ? 'Email Delivered Successfully' : 'Email Test Failed'}
                </div>
                <div className="mt-0.5 text-[11px] opacity-90">{testEmailResult.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Company & Operational Policies */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-cyan-400" /> General &amp; GPS Policies
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Company / Fleet Display Name</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">System Timezone</label>
              <select
                value={settings.timezone || 'Asia/Kolkata'}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Maximum Allowed GPS Accuracy (Meters)</label>
              <input
                type="number"
                min={5}
                max={500}
                value={settings.location_accuracy_threshold_meters || 50}
                onChange={(e) => setSettings({ ...settings, location_accuracy_threshold_meters: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Odoo ERP Integration */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-purple-400" /> Odoo 19 ERP Synchronization
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Odoo Base Instance URL</label>
              <input
                type="url"
                value={settings.odoo_instance_url || ''}
                onChange={(e) => setSettings({ ...settings, odoo_instance_url: e.target.value })}
                placeholder="https://mycompany.odoo.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Odoo Database Name</label>
              <input
                type="text"
                value={settings.odoo_database || ''}
                onChange={(e) => setSettings({ ...settings, odoo_database: e.target.value })}
                placeholder="production_db"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-900/40 text-xs cursor-pointer transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save All Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};

