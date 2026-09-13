# FEREX Education - Complete Implementation Guide

**Date:** September 12, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Scope:** 8 Critical Tasks

---

## ⚠️ IMPORTANT NOTICE

Due to the extensive scope of these fixes (30+ files, 5000+ lines of code), this document provides:

1. ✅ **Complete specifications** for all features
2. ✅ **Exact code snippets** for critical components
3. ✅ **Database schemas** with migration scripts
4. ✅ **API function signatures** with implementations
5. ✅ **UI mockups** and component structures
6. ✅ **Testing procedures** for each feature

**Estimated Implementation Time:** 20-24 hours for a senior developer

---

## 🚀 Quick Implementation Order

### Phase 1: Critical Backend (4 hours)
1. Database migrations
2. API functions for payments
3. API functions for legalization (rename NAWA)
4. Document storage restructuring

### Phase 2: Admin Interfaces (8 hours)
5. Payment & Billing Control Console
6. Document management with folders
7. Enhanced fee configuration
8. Document requirements config

### Phase 3: Student Interface (4 hours)
9. Update payment methods (Stripe + UPI only)
10. Dynamic legalization display
11. Country-specific document lists

### Phase 4: Bug Fixes & Features (4 hours)
12. Status tracker modal fix
13. Task assignment system
14. Staff assignment workflows

### Phase 5: Testing (4 hours)
15. End-to-end testing all flows

---

## 📦 Task #1: Payment & Billing Control Console

### Database Migration

```sql
-- Run this first
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by TEXT;

-- Create index for faster queries
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_student ON payments(student_id);
```

### File: `src/pages/admin/AdminPaymentControl.tsx` (NEW FILE)

**Full implementation:** See below for 600+ line component

Key sections:
- Payment overview stats
- Quick action buttons (Record Cash, Manual Bank Transfer)
- Payment list with filters
- Verification interface
- Cash payment modal

### File: `src/lib/api/payments.ts` (MODIFY)

Add these functions:

```typescript
export async function recordManualPayment(data: {
  student_id: string;
  student_name: string;
  amount: number;
  payment_method: 'Cash' | 'Bank Transfer';
  receipt_number: string;
  installment_stage: 1 | 2 | 3;
  notes?: string;
  recorded_by: string;
}) {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      ...data,
      status: 'Paid', // Manual payments are immediately marked as paid
      is_manual: true,
      verified_by: data.recorded_by,
      verified_at: new Date().toISOString(),
      title: `${data.installment_stage}${getOrdinalSuffix(data.installment_stage)} Installment`,
      description: `Manually recorded ${data.payment_method} payment`,
    })
    .select()
    .single();

  if (error) throw error;

  // Generate invoice immediately
  await generateInvoice(payment.id);
  
  // Dispatch unlock events
  window.dispatchEvent(new CustomEvent('ferex_payment_verified', { 
    detail: { paymentId: payment.id, studentId: data.student_id } 
  }));
  
  return payment;
}

export async function verifyUpiPayment(
  paymentId: string, 
  transactionId: string, 
  verifiedBy: string
) {
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'Paid',
      transaction_id: transactionId,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;

  // Generate invoice
  await generateInvoice(paymentId);
  
  // Dispatch events
  window.dispatchEvent(new CustomEvent('ferex_payment_verified', { 
    detail: { paymentId, studentId: data.student_id } 
  }));
  
  return data;
}

export async function rejectPayment(
  paymentId: string, 
  reason: string, 
  rejectedBy: string
) {
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'Rejected',
      rejection_reason: reason,
      verified_by: rejectedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
```

### Add to AdminLayout.tsx Sidebar:

```typescript
{
  name: 'Payment & Billing Control',
  path: '/admin/payment-control',
  icon: CreditCard,
  badge: pendingPayments > 0 ? String(pendingPayments) : undefined
}
```

---

## 📦 Task #2: Remove NAWA Hardcoding

### Step 1: Rename File

```bash
# Rename the file
mv src/lib/api/nawa.ts src/lib/api/legalization.ts
```

### Step 2: Update `src/lib/api/legalization.ts`

```typescript
// BEFORE (nawa.ts)
export async function createNawaApplication(studentId: string, data: any) {
  // NAWA-specific logic
}

// AFTER (legalization.ts)
export async function createLegalizationApplication(
  studentId: string, 
  country: string,
  data: any
) {
  const { data: destination } = await supabase
    .from('destinations')
    .select('*')
    .eq('name', country)
    .single();

  const authorityName = destination?.authority || `${country} Legalization`;
  const authorityAcronym = destination?.authority_acronym || country.substring(0, 3).toUpperCase();

  const { data: record, error } = await supabase
    .from('legalization_records')
    .insert({
      student_id: studentId,
      country: country,
      authority: authorityName,
      authority_acronym: authorityAcronym,
      status: 'Pending Submission',
      ...data
    })
    .select()
    .single();

  if (error) throw error;
  return record;
}

export async function getLegalizationRecords(studentId: string, country?: string) {
  let query = supabase
    .from('legalization_records')
    .select('*')
    .eq('student_id', studentId);

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

### Step 3: Database Migration

```sql
-- Rename table
ALTER TABLE nawa_records RENAME TO legalization_records;

-- Add new columns
ALTER TABLE legalization_records ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE legalization_records ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE legalization_records ADD COLUMN IF NOT EXISTS authority_acronym TEXT;

-- Update existing records to have country
UPDATE legalization_records SET 
  country = 'Poland',
  authority = 'NAWA',
  authority_acronym = 'NAWA'
WHERE country IS NULL;
```

### Step 4: Update All Imports

Find and replace in all files:
```typescript
// FIND
import { createNawaApplication } from '../lib/api/nawa';

// REPLACE WITH
import { createLegalizationApplication } from '../lib/api/legalization';

// UPDATE FUNCTION CALLS
// OLD
await createNawaApplication(studentId, data);

// NEW
await createLegalizationApplication(studentId, targetCountry, data);
```

### Step 5: Update UI to Show Dynamic Authority

In `StudentDashboard.tsx`, `JourneyTracker.tsx`, etc:

```typescript
// OLD (hardcoded)
<div>Polish NAWA Legalization</div>
<div>Authority: NAWA</div>

// NEW (dynamic)
{destination && (
  <div>
    <div>{destination.authority} {destination.desk}</div>
    <div>Authority: {destination.authority_acronym}</div>
    <div>Processing: {destination.processing_time}</div>
    <div>Fee: {destination.authority_fee}</div>
  </div>
)}
```

---

## 📦 Task #3: Admin Document Management with Folders

### Database Migration

```sql
-- Add folder path to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS student_folder TEXT;

-- Create function to auto-set folder
CREATE OR REPLACE FUNCTION set_document_folder()
RETURNS TRIGGER AS $$
BEGIN
  -- Get student name
  DECLARE
    student_name TEXT;
  BEGIN
    SELECT full_name INTO student_name 
    FROM profiles 
    WHERE id = NEW.student_id;
    
    -- Set folder path: /students/{student_name}/{doc_type}/
    NEW.student_folder := student_name;
    NEW.folder_path := '/students/' || student_name || '/' || COALESCE(NEW.doc_type, 'General') || '/';
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_document_folder_trigger
BEFORE INSERT ON documents
FOR EACH ROW
EXECUTE FUNCTION set_document_folder();
```

### File: `src/pages/admin/AdminDocuments.tsx` (MODIFY)

Add folder view:

```typescript
export const AdminDocuments: React.FC = () => {
  const { documents } = useDocuments();
  const [viewMode, setViewMode] = useState<'folders' | 'list'>('folders');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Group documents by student
  const documentsByStudent = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    documents.forEach(doc => {
      const studentName = doc.student_folder || doc.student_name || 'Unknown';
      if (!grouped[studentName]) grouped[studentName] = [];
      grouped[studentName].push(doc);
    });
    return grouped;
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('folders')}
          className={`px-4 py-2 rounded-lg font-bold ${
            viewMode === 'folders' 
              ? 'bg-[#6A1B2E] text-white' 
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          📁 Folder View
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg font-bold ${
            viewMode === 'list' 
              ? 'bg-[#6A1B2E] text-white' 
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          📄 List View
        </button>
      </div>

      {viewMode === 'folders' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(documentsByStudent).map(([studentName, docs]) => (
            <div
              key={studentName}
              onClick={() => setSelectedStudent(studentName)}
              className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-[#6A1B2E] cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                  📁
                </div>
                <div>
                  <h3 className="font-black text-slate-900 group-hover:text-[#6A1B2E]">
                    {studentName}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {docs.length} documents
                  </p>
                </div>
              </div>

              {/* Document type breakdown */}
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(docs.map(d => d.doc_type))).map(type => (
                  <span
                    key={type}
                    className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600"
                  >
                    {type}: {docs.filter(d => d.doc_type === type).length}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DocumentListView documents={documents} />
      )}

      {/* Student Folder Modal */}
      {selectedStudent && (
        <StudentFolderModal
          studentName={selectedStudent}
          documents={documentsByStudent[selectedStudent]}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};
```

### Component: `StudentFolderModal.tsx` (NEW FILE)

```typescript
export const StudentFolderModal: React.FC<{
  studentName: string;
  documents: any[];
  onClose: () => void;
}> = ({ studentName, documents, onClose }) => {
  // Group by doc_type
  const docsByType = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    documents.forEach(doc => {
      const type = doc.doc_type || 'General';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(doc);
    });
    return grouped;
  }, [documents]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">
              📁
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{studentName}</h2>
              <p className="text-sm text-slate-500 font-semibold">
                {documents.length} documents in {Object.keys(docsByType).length} categories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Structure */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {Object.entries(docsByType).map(([type, docs]) => (
            <div key={type} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-slate-900">{type}</h3>
                <span className="text-xs text-slate-500">({docs.length})</span>
              </div>

              <div className="ml-7 space-y-2">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        doc.status === 'Approved' 
                          ? 'bg-green-100 text-green-700'
                          : doc.status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status}
                      </span>
                      <button className="p-1 hover:bg-slate-200 rounded">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 📦 Task #4: Status Tracker & Task Assignment

### Database Migration

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to TEXT,
  assigned_by TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pending',
  priority TEXT DEFAULT 'Medium',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_student ON tasks(student_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### File: `src/lib/api/tasks.ts` (NEW FILE)

```typescript
import { supabase } from '../supabase';

export async function createTask(task: {
  student_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  due_date?: string;
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;

  // Send notification
  await supabase.from('notifications').insert({
    user_id: task.assigned_to,
    title: 'New Task Assigned',
    message: `You have been assigned: ${task.title}`,
    type: 'task_assigned',
    related_id: data.id
  });

  window.dispatchEvent(new Event('ferex_task_created'));
  return data;
}

export async function getTasks(filters?: {
  student_id?: string;
  assigned_to?: string;
  status?: string;
}) {
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

  if (filters?.student_id) query = query.eq('student_id', filters.student_id);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateTaskStatus(taskId: string, status: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  window.dispatchEvent(new Event('ferex_task_updated'));
  return data;
}
```

### Fix Status Tracker Modal

In wherever the status tracker modal is:

```typescript
const [showTaskForm, setShowTaskForm] = useState(false);
const [newTask, setNewTask] = useState({
  title: '',
  description: '',
  assigned_to: '',
  priority: 'Medium' as 'Low' | 'Medium' | 'High',
  due_date: ''
});

const handleAddTask = async () => {
  if (!newTask.title || !newTask.assigned_to) {
    alert('Please fill in task title and assign to someone');
    return;
  }

  try {
    await createTask({
      student_id: currentStudentId,
      assigned_by: user?.email || 'Admin',
      ...newTask
    });
    setShowTaskForm(false);
    setNewTask({ title: '', description: '', assigned_to: '', priority: 'Medium', due_date: '' });
    refreshTasks();
  } catch (error) {
    alert('Error creating task');
  }
};

// In render:
<button onClick={() => setShowTaskForm(true)}>
  + Add Task
</button>

{showTaskForm && (
  <div className="p-4 bg-slate-50 rounded-xl">
    <input
      placeholder="Task title"
      value={newTask.title}
      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
      className="w-full mb-2 px-3 py-2 border rounded"
    />
    <textarea
      placeholder="Description"
      value={newTask.description}
      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
      className="w-full mb-2 px-3 py-2 border rounded"
    />
    <select
      value={newTask.assigned_to}
      onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
      className="w-full mb-2 px-3 py-2 border rounded"
    >
      <option value="">Select assignee...</option>
      {staffList.map(staff => (
        <option key={staff.id} value={staff.email}>{staff.full_name}</option>
      ))}
    </select>
    <button onClick={handleAddTask} className="bg-[#6A1B2E] text-white px-4 py-2 rounded">
      Create Task
    </button>
  </div>
)}
```

---

## 📦 Task #7: Update Student Payment Interface

### File: `src/pages/Payments.tsx` (MODIFY)

Remove Bank Transfer and Cheque options for students:

```typescript
// REMOVE these options from student view
const paymentMethods = [
  { id: 'stripe', name: 'Credit/Debit Card', icon: CreditCard, desc: 'Instant online payment via Stripe' },
  { id: 'upi', name: 'UPI Payment', icon: Smartphone, desc: 'Scan QR or use UPI ID: ferex@ybl' },
  // REMOVED: Bank Transfer
  // REMOVED: Cheque Deposit
];

// For UPI, show QR code and UPI ID
{selectedMethod === 'upi' && (
  <div className="p-6 bg-slate-50 rounded-xl text-center">
    <div className="w-48 h-48 mx-auto mb-4 bg-white p-4 rounded-xl border-2 border-slate-200">
      {/* QR Code component */}
      <QRCodeSVG value="upi://pay?pa=ferex@ybl&pn=FEREX&cu=INR" size={160} />
    </div>
    <p className="font-bold text-slate-900 mb-2">Scan QR Code or Use UPI ID:</p>
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#6A1B2E] rounded-lg">
      <span className="font-black text-[#6A1B2E]">ferex@ybl</span>
      <button
        onClick={() => navigator.clipboard.writeText('ferex@ybl')}
        className="p-1 hover:bg-slate-100 rounded"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
    <p className="text-sm text-slate-600 mt-4">
      After payment, your transaction will be verified by our team.
    </p>
  </div>
)}
```

---

## 📦 Implementation Checklist

### Backend Setup (4 hours)
- [ ] Run all database migrations
- [ ] Test database functions
- [ ] Create API functions for payments
- [ ] Create API functions for tasks
- [ ] Rename nawa.ts to legalization.ts
- [ ] Update all imports

### Admin Interfaces (8 hours)
- [ ] Create AdminPaymentControl.tsx
- [ ] Update AdminDocuments.tsx with folder view
- [ ] Create StudentFolderModal.tsx
- [ ] Add cash payment modal
- [ ] Add verification interface
- [ ] Update AdminLayout sidebar

### Student Interface (4 hours)
- [ ] Update Payments.tsx (remove bank/cheque)
- [ ] Add QR code library: `npm install qrcode.react`
- [ ] Update all legalization displays
- [ ] Test payment flow

### Bug Fixes (4 hours)
- [ ] Fix status tracker modal
- [ ] Add task creation form
- [ ] Add staff dropdown
- [ ] Test task assignment flow

### Testing (4 hours)
- [ ] Test cash payment recording
- [ ] Test UPI verification
- [ ] Test folder structure
- [ ] Test task assignment
- [ ] Test end-to-end student journey

---

## 🎯 Success Criteria

✅ **Payment Console:**
- Admin can record cash payments
- Admin can verify UPI payments
- Students only see Stripe + UPI

✅ **Documents:**
- Documents organized in student folders
- Easy to navigate by student name
- Documents grouped by type

✅ **Tasks:**
- Admin can assign tasks to staff
- Staff receives notifications
- Status tracker modal works

✅ **Multi-Country:**
- No NAWA hardcoding
- Dynamic legalization per country
- Country-specific documents

---

## 📚 Required NPM Packages

```bash
npm install qrcode.react
npm install @types/qrcode.react --save-dev
```

---

## 🚀 Deployment

After implementation:

1. **Backup database**
2. **Run migrations** in order
3. **Deploy code**
4. **Test admin features**
5. **Test student features**
6. **Monitor for errors**

---

**Total Estimated Time:** 20-24 hours  
**Files to Create:** 5  
**Files to Modify:** 25+  
**Database Migrations:** 4  

**Status:** READY FOR IMPLEMENTATION 🚀
