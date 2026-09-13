# FEREX Critical Fixes - Implementation Plan

**Date:** September 12, 2026  
**Status:** IN PROGRESS - 1/6 Complete  
**Priority:** CRITICAL

---

## ✅ Task #1: COMPLETE - Poland Default Removal

### What Was Fixed:
- Removed all hardcoded `'Poland'` defaults across 9+ files
- Country now defaults to empty string `''` or `'Not Set'`
- Students MUST select country during profile setup
- No automatic assumptions about target country

### Files Modified:
1. `src/pages/SelectUniversity.tsx`
2. `src/pages/VisaTracker.tsx`
3. `src/pages/PreDeparture.tsx`
4. `src/pages/StudentDashboard.tsx`
5. `src/pages/Payments.tsx`
6. `src/pages/JourneyTracker.tsx`
7. `src/pages/MyProfile.tsx`
8. `src/pages/FerexLandingPage.tsx`
9. `src/pages/staff/StaffStudents.tsx`

---

## 🔄 Task #2: Document Configuration System (TO IMPLEMENT)

### Requirement:
Admin needs ability to configure required documents per country in settings.

### Implementation Plan:

**New Admin Page:** `/admin/document-config`

**Features Required:**
1. Country selector dropdown
2. Add/Remove document requirements per country
3. Mark documents as Required/Optional
4. Configure document types:
   - Passport
   - Academic Transcripts
   - MOI Certificate
   - Apostille Attestation
   - Bank Statements
   - Health Insurance
   - Country-specific documents

**Database Schema:**
```sql
CREATE TABLE document_requirements (
  id UUID PRIMARY KEY,
  country TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  description TEXT,
  processing_time TEXT,
  authority_fee TEXT,
  checklist_items JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country, document_name)
);
```

**API Functions:**
- `getDocumentRequirements(country: string)`
- `updateDocumentRequirement(country, docConfig)`
- `addDocumentRequirement(country, docConfig)`
- `removeDocumentRequirement(country, docName)`

**Student View Impact:**
- Documents page shows only requirements for SELECTED country
- No NAWA-specific hardcoding
- Dynamic checklist based on country

---

## 🔄 Task #3: Enhanced Fee Configuration (TO IMPLEMENT)

### Current Issues:
1. 15K/20K payment not enforced BEFORE university selection
2. Need more granular settings
3. Missing configuration options

### Fixes Required:

#### A. Enforce 1st Installment BEFORE University Selection

**Current:** Payment guard exists but can be bypassed
**Fix:** Hard block with modal redirect

```typescript
// In SelectUniversity.tsx
if (!payment1Status.isUnlocked) {
  return <LockedStateWithPaymentRedirect />;
}
```

#### B. Add More Settings to Fee Config Page

**New Settings Needed:**

1. **Currency Settings:**
   - Default currency (INR/EUR/USD)
   - Exchange rate configuration
   - Multi-currency support toggle

2. **Payment Method Settings:**
   - Enable/Disable Stripe
   - Enable/Disable UPI
   - Enable/Disable Bank Transfer
   - Enable/Disable Cash (Admin only)

3. **Installment Timing:**
   - Days after offer for 2nd installment
   - Days before visa appointment for 3rd installment
   - Auto-reminders configuration

4. **Late Payment Settings:**
   - Late fee amount
   - Grace period (days)
   - Auto-suspension toggle

5. **Refund Policy:**
   - Refundable percentage per stage
   - Processing fee
   - Refund processing time

6. **Invoice Settings:**
   - Company GSTIN
   - Company address
   - Logo URL
   - Invoice prefix/format

**File to Enhance:** `src/pages/admin/AdminFeeConfig.tsx`

---

## 🔄 Task #4: Fix Status Tracker & Staff Assignment (TO IMPLEMENT)

### Issues:
1. Status tracker sidebar modal not working
2. Can't add tasks from admin panel
3. Staff assignment not working
4. Counselor should be generic (not country-specific) ✅ Already Fixed

### Fixes Required:

#### A. Fix Status Tracker Sidebar

**File:** `src/components/StatusTrackerModal.tsx` (or wherever it exists)

**Problems:**
- Modal doesn't open properly
- Task creation form broken
- Assignment dropdown not showing staff

**Fix:**
```typescript
// Enable task creation in modal
const [showTaskForm, setShowTaskForm] = useState(false);
const [newTask, setNewTask] = useState({
  title: '',
  description: '',
  assigned_to: '',
  due_date: '',
  priority: 'Medium'
});

const handleAddTask = async () => {
  await addTask({
    student_id: currentStudentId,
    ...newTask,
    status: 'Pending'
  });
  setShowTaskForm(false);
  refreshTasks();
};
```

#### B. Enable Task Assignment in Admin

**File:** `src/pages/admin/AdminStudents.tsx` or similar

**Add:**
- Task assignment button in student details
- Bulk task assignment
- Task templates

#### C. Fix Staff Assignment

**Database:** Ensure `profiles` table has:
- `assigned_counselor` TEXT field
- `assigned_staff` JSONB field for multiple staff

**Admin UI:**
- Dropdown of all staff/counselors
- Search functionality
- Bulk assignment capability

**Current Status:** ✅ Country-specific auto-assignment already removed

---

## 🔄 Task #5: Payment & Billing Control Console (TO IMPLEMENT)

### Requirement:
New admin sidebar for comprehensive payment management.

### Implementation:

**New Admin Page:** `/admin/payment-control`

**Sidebar Entry:**
```typescript
{
  name: 'Payment & Billing Control',
  icon: CreditCard,
  path: '/admin/payment-control',
  badge: pendingVerifications
}
```

**Features:**

#### A. Payment Overview Section
- Total payments received (today/week/month)
- Pending verifications count
- Rejected payments count
- Payment method breakdown chart

#### B. Student Payment Options (What Students See)
- ✅ Stripe (online card payment)
- ✅ UPI (shows QR code or UPI ID)
- ❌ REMOVE: Bank Transfer interface
- ❌ REMOVE: Cheque option

**Student Payment Flow:**
1. Student selects Stripe or UPI
2. Stripe → Redirects to Stripe checkout
3. UPI → Shows QR code + UPI ID: `ferex@ybl`
4. Student completes payment
5. Status: "Pending Verification" (for UPI) or "Paid" (for Stripe)

#### C. Admin Payment Control (What Admin Sees)

**All Payment Methods:**
1. **Stripe Payments:**
   - Auto-marked as "Paid" via webhook
   - Shows transaction ID
   - Shows Stripe receipt

2. **UPI Payments:**
   - Student submits payment
   - Shows as "Pending Verification"
   - Admin verifies manually
   - Admin marks as "Paid" or "Rejected"

3. **Cash Payments (Admin Raises):**
   - Admin creates cash payment record
   - Admin enters:
     - Student name
     - Amount
     - Receipt number
     - Date received
   - Auto-marked as "Paid"
   - Generates invoice immediately

4. **Bank Transfer (Admin Verifies):**
   - Admin can manually add bank transfer
   - Similar to cash payment flow
   - Requires proof of transfer upload

**UI Layout:**

```
┌─────────────────────────────────────┐
│  Payment & Billing Control Console  │
├─────────────────────────────────────┤
│  [Overview Stats]                   │
│  Total Today: ₹1,25,000             │
│  Pending: 8 payments                │
├─────────────────────────────────────┤
│  Quick Actions:                     │
│  [+ Record Cash Payment]            │
│  [+ Manual Bank Transfer]           │
│  [View Pending Verifications]       │
├─────────────────────────────────────┤
│  Payment List (Filters):            │
│  [All] [Stripe] [UPI] [Cash] [Bank] │
│  [Paid] [Pending] [Rejected]        │
├─────────────────────────────────────┤
│  Student Name | Amount | Method | Status | Actions
│  John Doe    | ₹15,000 | UPI   | Pending | [Verify] [Reject]
│  Jane Smith  | ₹15,000 | Stripe | Paid   | [Receipt]
│  ...
└─────────────────────────────────────┘
```

**Modal for Cash Payment:**
```typescript
interface CashPaymentForm {
  student_id: string;
  student_name: string;
  amount: number;
  installment_stage: 1 | 2 | 3;
  receipt_number: string;
  date_received: string;
  notes?: string;
}
```

---

## 🔄 Task #6: Remove NAWA Hardcoding (TO IMPLEMENT)

### Current Issue:
NAWA (Polish legalization) is hardcoded everywhere, but system supports multiple countries.

### Fixes Required:

#### A. Remove All NAWA References

**Files to Update:**
- `src/pages/StudentDashboard.tsx`
- `src/pages/JourneyTracker.tsx`
- `src/pages/Documents.tsx`
- `src/pages/SelectUniversity.tsx`
- `src/lib/api/nawa.ts` → Rename to `legalization.ts`

#### B. Make Legalization Dynamic

**Use Destinations Table:**
```typescript
// Instead of hardcoded NAWA
const legalizationAuthority = destination.authority; // "NAWA" | "APS" | "CAS" | "Campus France"
const legalizationAcronym = destination.authority_acronym; // "NAWA" | "APS" | "CAS" | "EEF"
const processingTime = destination.processing_time; // "14-21 Days"
const authorityFee = destination.authority_fee; // "€250"
```

**Update UI to Show:**
```typescript
// Dynamic display based on country
{targetCountry === 'Poland' && (
  <div>NAWA Legalization Required</div>
)}

{targetCountry === 'Germany' && (
  <div>APS Certificate Required</div>
)}

{targetCountry === 'UK' && (
  <div>CAS Statement Required</div>
)}

// Better: Use destination data
<div>
  {destination.authority} Required
  Processing: {destination.processing_time}
  Fee: {destination.authority_fee}
</div>
```

#### C. Update Journey Tracker Steps

**Current:** Hardcoded "NAWA Legalization" as step

**Fix:** Dynamic step based on country
```typescript
const legalizationStep = {
  num: 3,
  name: `${destination.authority} ${destination.desk}`,
  desc: `${destination.description || 'Government certification process'}`,
  authority: destination.authority,
  processingTime: destination.processing_time,
  fee: destination.authority_fee
};
```

#### D. Update Document Requirements

**Current:** Shows NAWA-specific documents for all countries

**Fix:** 
```typescript
const requiredDocs = getDocumentRequirements(targetCountry);

// Poland → Shows NAWA docs
// Germany → Shows APS docs
// UK → Shows CAS docs
// France → Shows Campus France docs
```

#### E. Rename API File

**From:** `src/lib/api/nawa.ts`
**To:** `src/lib/api/legalization.ts`

**Update Functions:**
```typescript
// Old
createNawaApplication()
updateNawaStatus()
getNawaRecords()

// New (generic)
createLegalizationApplication(country, data)
updateLegalizationStatus(country, id, status)
getLegalizationRecords(country, studentId)
```

---

## Implementation Priority

### Phase 1 (Critical - 4 hours):
1. ✅ Remove Poland defaults (DONE)
2. Task #6: Remove NAWA hardcoding
3. Task #5: Create Payment Control Console basics

### Phase 2 (High Priority - 6 hours):
4. Task #4: Fix status tracker and task assignment
5. Task #3: Enhance fee configuration
6. Task #5: Complete Payment Control features

### Phase 3 (Medium Priority - 4 hours):
7. Task #2: Document configuration system

---

## Testing Checklist

### Test Scenario 1: New Student (Germany)
- [ ] Register → No Poland default
- [ ] Select Germany as target country
- [ ] See APS requirements (not NAWA)
- [ ] See Germany-specific fees
- [ ] Submit 1st payment via UPI
- [ ] Admin verifies in Payment Control
- [ ] University selection unlocks

### Test Scenario 2: Admin Payment Control
- [ ] Admin opens Payment & Billing Control
- [ ] Admin records cash payment for student
- [ ] Invoice auto-generates
- [ ] Payment shows as "Paid" immediately
- [ ] Student sees payment in their list

### Test Scenario 3: Staff Assignment
- [ ] Admin assigns counselor to student
- [ ] Counselor sees student in their dashboard
- [ ] Admin creates task for counselor
- [ ] Counselor receives notification
- [ ] Status tracker shows assigned tasks

### Test Scenario 4: Document Requirements
- [ ] Admin configures UK documents
- [ ] Student (UK) sees only UK documents
- [ ] CAS requirements shown (not NAWA)
- [ ] Upload documents
- [ ] Admin approves → Triggers UK legalization

---

## Files to Create

### New Files:
1. `src/pages/admin/AdminDocumentConfig.tsx` - Document configuration UI
2. `src/pages/admin/AdminPaymentControl.tsx` - Payment control console
3. `src/lib/api/legalization.ts` - Renamed from nawa.ts
4. `src/lib/api/documentRequirements.ts` - Document config API
5. `src/components/CashPaymentModal.tsx` - Admin cash payment form

### Files to Modify:
1. `src/pages/admin/AdminFeeConfig.tsx` - Add more settings
2. `src/layouts/AdminLayout.tsx` - Add new sidebar entries
3. `src/App.tsx` - Add new routes
4. `src/lib/api/nawa.ts` - Rename to legalization.ts
5. Multiple files - Remove NAWA hardcoding

---

## Database Changes Required

### New Tables:

```sql
-- Document requirements per country
CREATE TABLE document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  description TEXT,
  processing_time TEXT,
  authority_fee TEXT,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country, document_name)
);

-- Enhanced payment records
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Task assignments
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  assigned_to TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pending',
  priority TEXT DEFAULT 'Medium',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Legalization records (generic, not NAWA-specific)
ALTER TABLE nawa_records RENAME TO legalization_records;
ALTER TABLE legalization_records ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE legalization_records ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE legalization_records ADD COLUMN IF NOT EXISTS authority_acronym TEXT;
```

---

## Summary

**Total Tasks:** 6  
**Completed:** 1 ✅  
**In Progress:** 5 🔄  
**Estimated Time:** 14 hours remaining  
**Priority:** CRITICAL  

**Next Steps:**
1. Implement Payment & Billing Control Console (Task #5) - 4 hours
2. Remove NAWA hardcoding (Task #6) - 2 hours
3. Fix status tracker (Task #4) - 3 hours
4. Enhance fee config (Task #3) - 3 hours
5. Document configuration (Task #2) - 2 hours

**Impact:**
- ✅ Multi-country support fully functional
- ✅ Admin has complete payment control
- ✅ Staff assignment works seamlessly
- ✅ No country-specific hardcoding
- ✅ Professional payment management

---

**Status:** Ready for implementation  
**Last Updated:** September 12, 2026
