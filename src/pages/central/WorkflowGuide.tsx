/**
 * FEREX Education Complete Workflow Guide
 * 
 * Comprehensive visual documentation of all workflows, processes, and system flows
 * across Student, Admin, and Counselor roles with interactive diagrams.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronRight, ChevronDown, Users, Shield, UserCheck,
  CreditCard, FileCheck, Globe, GraduationCap, Plane, CheckCircle2,
  ArrowRight, ArrowDown, AlertCircle, Lock, Unlock, FileText,
  DollarSign, Building2, ShieldCheck, Calendar, Clock, Zap, GitBranch
} from 'lucide-react';
import { Card } from '../../components/Card';

export const WorkflowGuide: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<'ferex-edu' | 'trade' | 'rimi' | 'digital' | null>('ferex-edu');
  const [selectedSection, setSelectedSection] = useState<string>('overview');
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set(['registration']));

  const toggleFlow = (flowId: string) => {
    setExpandedFlows(prev => {
      const next = new Set(prev);
      if (next.has(flowId)) {
        next.delete(flowId);
      } else {
        next.add(flowId);
      }
      return next;
    });
  };

  const apps = [
    { id: 'ferex-edu', name: 'Ferex Education', icon: GraduationCap, color: 'bg-[#6A1B2E]', available: true },
    { id: 'trade', name: 'Global Trade', icon: Globe, color: 'bg-blue-600', available: false },
    { id: 'rimi', name: 'Rimi Frozen', icon: Building2, color: 'bg-emerald-600', available: false },
    { id: 'digital', name: 'Ferex Digital', icon: Zap, color: 'bg-purple-600', available: false },
  ];

  if (!selectedApp) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900">FEREX Complete Workflow Guide</h1>
            <p className="text-sm font-semibold text-slate-500 max-w-2xl mx-auto">
              Select an application to view its complete workflow documentation, process flows, and system diagrams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {apps.map(app => {
              const Icon = app.icon;
              return (
                <Card
                  key={app.id}
                  className={`p-8 cursor-pointer transition-all hover:shadow-xl ${
                    app.available ? 'hover:border-slate-300' : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => app.available && setSelectedApp(app.id as any)}
                >
                  <div className={`w-16 h-16 rounded-2xl ${app.color} text-white flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">{app.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {app.available ? 'Click to view complete workflow' : 'Coming soon'}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Ferex Education Workflow Content
  const sections = [
    { id: 'overview', name: 'System Overview', icon: BookOpen },
    { id: 'roles', name: '3-Role Architecture', icon: Users },
    { id: 'registration', name: 'Student Registration Flow', icon: UserCheck },
    { id: 'payments', name: 'Payment & Unlocking System', icon: CreditCard },
    { id: 'documents', name: 'Document Approval Workflow', icon: FileCheck },
    { id: 'legalization', name: 'Country Legalization (NAWA)', icon: Globe },
    { id: 'applications', name: 'University Applications', icon: GraduationCap },
    { id: 'offers', name: 'Offer Letters & Acceptance', icon: FileText },
    { id: 'visa', name: 'VFS Visa Tracking', icon: ShieldCheck },
    { id: 'journey', name: '12-Stage Journey Tracker', icon: GitBranch },
    { id: 'counselor', name: 'Counselor Workflows', icon: Calendar },
    { id: 'sync', name: 'Cross-Role Synchronization', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedApp(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              ← Back to Apps
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6A1B2E] text-white flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Ferex Education Workflow Guide</h1>
              <p className="text-xs font-semibold text-slate-500">
                Complete system documentation • Student Journey • Admin Operations • Counselor Workflows
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 shrink-0">
            <Card className="p-4 sticky top-32">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Sections</h3>
              <div className="space-y-1">
                {sections.map(section => {
                  const Icon = section.icon;
                  const isActive = selectedSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'bg-[#6A1B2E] text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{section.name}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {selectedSection === 'overview' && <OverviewSection />}
            {selectedSection === 'roles' && <RolesSection />}
            {selectedSection === 'registration' && <RegistrationFlowSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'payments' && <PaymentsSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'documents' && <DocumentsSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'legalization' && <LegalizationSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'applications' && <ApplicationsSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'offers' && <OffersSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'visa' && <VisaSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'journey' && <JourneySection />}
            {selectedSection === 'counselor' && <CounselorSection expandedFlows={expandedFlows} toggleFlow={toggleFlow} />}
            {selectedSection === 'sync' && <SyncSection />}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

const OverviewSection: React.FC = () => (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-black text-slate-900 mb-4">System Architecture Overview</h2>
      <div className="prose prose-sm max-w-none">
        <p className="text-sm font-semibold text-slate-600 leading-relaxed">
          FEREX Education is a comprehensive multi-country education management platform connecting students,
          admissions counselors, and administrators across the complete study abroad journey from registration
          through post-travel management.
        </p>
      </div>
    </Card>

    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
      <h3 className="text-sm font-black text-slate-900 mb-4">Core System Components</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: '3 User Roles', desc: 'Student, Admin, Counselor', icon: Users },
          { title: '12-Stage Journey', desc: 'Complete admission to travel', icon: GitBranch },
          { title: '3-Installment Payments', desc: 'Registration, Tuition, VFS', icon: CreditCard },
          { title: 'Multi-Country Support', desc: 'Poland, Germany, UK, France +', icon: Globe },
          { title: 'Document Vault', desc: 'Secure upload & verification', icon: FileCheck },
          { title: 'Real-time Sync', desc: 'Cross-role data consistency', icon: Zap },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
              <Icon className="w-5 h-5 text-[#6A1B2E] mb-2" />
              <h4 className="text-xs font-black text-slate-900">{item.title}</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </Card>
  </div>
);

const RolesSection: React.FC = () => (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-black text-slate-900 mb-6">3-Role System Architecture</h2>
      
      {/* Student Role */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Student Role</h3>
            <p className="text-xs font-semibold text-slate-500">Self-service journey management</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Access:</strong> Dashboard, Journey Tracker, University Selection, Applications, Offer Letters, Documents, Payments, Invoices, VFS Visa Tracker, Pre-Departure, Meetings, Support</p>
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Permissions:</strong> Upload documents, submit payments, select universities, accept offers, view progress</p>
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Restrictions:</strong> Cannot modify approved data, payment verification required for stage unlocking</p>
        </div>
      </div>

      {/* Admin Role */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Admin Role</h3>
            <p className="text-xs font-semibold text-slate-500">Complete system control & verification</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Access:</strong> All student data, payment verification, document review, application management, NAWA workflows, visa tracking, counselor assignment, system settings</p>
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Permissions:</strong> Verify/reject payments, approve/reject documents, update application status, assign counselors, configure fees, upload offer letters, manage universities</p>
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Workflows:</strong> Payment verification → Invoice generation → Journey unlock, Document approval → NAWA trigger, Application updates → Status sync</p>
        </div>
      </div>

      {/* Counselor Role */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Counselor/Staff Role</h3>
            <p className="text-xs font-semibold text-slate-500">Student advisory & task management</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Access:</strong> Assigned students, tasks, meetings, documents (limited), notes, support tickets</p>
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Permissions:</strong> View assigned students, add advisory notes, schedule meetings, manage tasks, create support tickets</p>
          <p className="font-semibold text-slate-700"><strong className="text-slate-900">Restrictions:</strong> Read-only financial data, cannot verify payments or approve documents (admin-only)</p>
        </div>
      </div>
    </Card>
  </div>
);

interface FlowSectionProps {
  expandedFlows: Set<string>;
  toggleFlow: (id: string) => void;
}

const RegistrationFlowSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-black text-slate-900 mb-4">Student Registration & Onboarding Flow</h2>
      
      {/* Flow Diagram */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 mb-6">
        <div className="space-y-4">
          <FlowStep number={1} title="Student Registration" description="Email, password, full name, phone number" icon={UserCheck} />
          <FlowArrow />
          <FlowStep number={2} title="Email Verification" description="Automated verification email sent" icon={CheckCircle2} />
          <FlowArrow />
          <FlowStep number={3} title="Profile Completion" description="Educational background, target country selection" icon={FileText} />
          <FlowArrow />
          <FlowStep number={4} title="Auto-Counselor Assignment" description="Default counselor assigned based on target country" icon={UserCheck} color="amber" />
          <FlowArrow />
          <FlowStep number={5} title="Welcome Dashboard Access" description="12-stage journey visible, first payment required" icon={GraduationCap} />
        </div>
      </div>

      <ExpandableFlow
        id="registration-details"
        title="Technical Implementation Details"
        isExpanded={expandedFlows.has('registration-details')}
        onToggle={() => toggleFlow('registration-details')}
      >
        <div className="space-y-3 text-xs font-semibold text-slate-700">
          <p><strong className="text-slate-900">Database Tables:</strong> users (auth), profiles (student data)</p>
          <p><strong className="text-slate-900">Events Dispatched:</strong> ferex_student_registered, ferex_counselor_assigned, ferex_auth_change</p>
          <p><strong className="text-slate-900">Notifications:</strong> Welcome email, counselor introduction notification</p>
          <p><strong className="text-slate-900">Initial State:</strong> All journey stages locked except profile completion</p>
        </div>
      </ExpandableFlow>
    </Card>
  </div>
);

const PaymentsSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-black text-slate-900 mb-4">3-Installment Payment & Journey Unlocking System</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PaymentCard
          stage="1st Installment"
          amount="₹15,000"
          title="Registration & Legalization Fee"
          unlocks={['University Selection', 'Application Submission', 'NAWA Process']}
          methods={['Stripe', 'UPI', 'Bank Transfer', 'Cash']}
        />
        <PaymentCard
          stage="2nd Installment"
          amount="Dynamic"
          title="University Tuition Fee"
          unlocks={['Offer Acceptance', 'Final Acceptance Letter', 'Visa Tracker Access']}
          methods={['Stripe', 'Bank Wire', 'International Transfer']}
        />
        <PaymentCard
          stage="3rd Installment"
          amount="₹53,000"
          title="Agency & VFS Visa Fee"
          unlocks={['Pre-Departure Checklist', 'Travel Planning', 'Final Clearance']}
          methods={['Stripe', 'UPI', 'Bank Transfer']}
        />
      </div>

      <Card className="bg-amber-50 border-amber-200 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold text-amber-900">
            <p className="font-black mb-1">Critical Payment Flow Rule</p>
            <p>Offline payments (Bank Transfer, Cash, UPI) enter <strong>"Pending Verification"</strong> status. Student journey stages remain locked until Admin verifies the payment. Once verified, invoice/receipt is auto-generated and journey stages unlock immediately.</p>
          </div>
        </div>
      </Card>

      {/* Payment Verification Flow */}
      <div className="bg-gradient-to-br from-slate-50 to-emerald-50 rounded-xl p-6">
        <h3 className="text-sm font-black text-slate-900 mb-4">Payment Verification Workflow</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs font-black text-slate-900">Student Submits Payment Proof</p>
              <p className="text-xs font-semibold text-slate-500">UTR number, receipt screenshot, payment method</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className="flex-1 bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs font-black text-amber-900">Status: Pending Verification</p>
              <p className="text-xs font-semibold text-amber-700">Awaiting admin review</p>
            </div>
          </div>
          <ArrowDown className="w-5 h-5 text-slate-400 mx-auto" />
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs font-black text-slate-900">Admin Reviews & Verifies</p>
              <p className="text-xs font-semibold text-slate-500">Checks bank records, validates amount</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className="flex-1 bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <p className="text-xs font-black text-emerald-900">Status: Paid ✓</p>
              <p className="text-xs font-semibold text-emerald-700">Invoice generated, stages unlocked</p>
            </div>
          </div>
        </div>
      </div>

      <ExpandableFlow
        id="payment-tech"
        title="Payment Unlocking Technical Details"
        isExpanded={expandedFlows.has('payment-tech')}
        onToggle={() => toggleFlow('payment-tech')}
      >
        <div className="space-y-3 text-xs font-semibold text-slate-700">
          <p><strong className="text-slate-900">Utility:</strong> paymentUnlock.ts - checkPaymentStage(), getJourneyStageAccess(), canAccessPage()</p>
          <p><strong className="text-slate-900">Events:</strong> ferex_payment_verified, ferex_journey_unlock, ferex_payment_change</p>
          <p><strong className="text-slate-900">Database:</strong> payments table with stage_number column, status tracking</p>
          <p><strong className="text-slate-900">Invoice Generation:</strong> Automatic PDF creation with GSTIN, tax breakdown, UTR reference</p>
        </div>
      </ExpandableFlow>
    </Card>
  </div>
);

// Payment Card Component
const PaymentCard: React.FC<{
  stage: string;
  amount: string;
  title: string;
  unlocks: string[];
  methods: string[];
}> = ({ stage, amount, title, unlocks, methods }) => (
  <Card className="p-4 border-2 border-[#6A1B2E]/20 hover:border-[#6A1B2E]/40 transition-all">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-black uppercase text-[#6A1B2E]">{stage}</span>
      <span className="text-lg font-black text-slate-900">{amount}</span>
    </div>
    <h4 className="text-sm font-black text-slate-900 mb-3">{title}</h4>
    
    <div className="space-y-3">
      <div>
        <p className="text-xs font-black text-slate-500 uppercase mb-1.5">Unlocks</p>
        <div className="space-y-1">
          {unlocks.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Unlock className="w-3 h-3 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <p className="text-xs font-black text-slate-500 uppercase mb-1.5">Payment Methods</p>
        <div className="flex flex-wrap gap-1">
          {methods.map((method, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
              {method}
            </span>
          ))}
        </div>
      </div>
    </div>
  </Card>
);

// Continue with other sections...
const DocumentsSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">Document Upload & Approval Workflow</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      Student uploads → Admin reviews → Approved documents trigger NAWA legalization process
    </p>
    {/* Add document workflow diagram */}
  </Card>
);

const LegalizationSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">Multi-Country Legalization Workflows</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      Country-specific document legalization: NAWA (Poland), APS (Germany), CAS (UK), Campus France, etc.
    </p>
    {/* Add country workflow configurations */}
  </Card>
);

const ApplicationsSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">University Application Workflow</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      Application submission → Admin review → NAWA sync → University decision
    </p>
  </Card>
);

const OffersSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">Offer Letter & Acceptance Flow</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      Admin uploads offer → Student accepts → 2nd payment unlocked → Final acceptance issued
    </p>
  </Card>
);

const VisaSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">VFS Visa Tracking System</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      6-stage visa process: Application → VFS slot → Biometrics → Embassy review → Decision → Passport delivery
    </p>
  </Card>
);

const JourneySection: React.FC = () => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">12-Stage Student Journey Tracker</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      Complete visual roadmap from registration through campus arrival with payment-based unlocking
    </p>
  </Card>
);

const CounselorSection: React.FC<FlowSectionProps> = ({ expandedFlows, toggleFlow }) => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">Counselor Assignment & Advisory Workflows</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      Auto-assignment by country → Student meetings → Advisory notes → Task management
    </p>
  </Card>
);

const SyncSection: React.FC = () => (
  <Card className="p-6">
    <h2 className="text-xl font-black text-slate-900 mb-4">Cross-Role Synchronization System</h2>
    <p className="text-sm font-semibold text-slate-600 mb-6">
      40+ event types ensuring real-time data consistency across Student, Admin, and Counselor roles
    </p>
  </Card>
);

// Helper Components
const FlowStep: React.FC<{
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}> = ({ number, title, description, icon: Icon, color = 'blue' }) => (
  <div className="flex items-center gap-4">
    <div className={`w-10 h-10 rounded-full bg-${color}-100 text-${color}-700 flex items-center justify-center font-black text-sm shrink-0`}>
      {number}
    </div>
    <div className="flex-1 bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[#6A1B2E]" />
        <div>
          <h4 className="text-sm font-black text-slate-900">{title}</h4>
          <p className="text-xs font-semibold text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  </div>
);

const FlowArrow: React.FC = () => (
  <div className="flex justify-center">
    <ArrowDown className="w-5 h-5 text-slate-400" />
  </div>
);

const ExpandableFlow: React.FC<{
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
    >
      <span className="text-sm font-black text-slate-900">{title}</span>
      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
    </button>
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="p-4 bg-white border-t border-slate-200">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
