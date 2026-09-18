import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CheckCircle2, Save, Lock } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { getMasters, createMaster, deleteMaster } from '../../lib/api/masters';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { useAuth } from '../../contexts/AuthContext';

const DIGITAL_ADMIN_ROLES = ['digital_admin', 'ferex_digital', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

type DigitalTab = 'branding' | 'client_policies' | 'delivery' | 'broadcast' | 'services' | 'masters' | 'security';

export const DigitalSettings: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = DIGITAL_ADMIN_ROLES.includes(profile?.role || '');
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<DigitalTab>('branding');

  // Admin-only guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">Settings Access Restricted</h2>
          <p className="text-sm font-semibold text-slate-500 max-w-sm">
            Settings are only accessible to Administrators.
          </p>
        </div>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#58051E]" /> Digital Settings
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage your Digital admin settings
          </p>
        </div>
      </div>

      <Card className="p-6 border border-slate-200/70 shadow-xs max-w-2xl">
        <ChangePasswordForm
          title="Digital Admin Password"
          subtitle="Update your administrator credentials for FEREX Digital"
          variant="plain"
        />
      </Card>
    </div>
  );
};
