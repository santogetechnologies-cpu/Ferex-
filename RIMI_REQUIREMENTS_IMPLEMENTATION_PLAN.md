# RIMI FROZEN - REQUIREMENTS GAP ANALYSIS & IMPLEMENTATION PLAN

## 📋 AUDIT SUMMARY

### ✅ EXISTING FEATURES (Keep & Enhance)
1. **Customer Types** - 3-tier structure exists (Distributors, Retailers, Wholesalers)
2. **Basic CRM** - Customer CRUD operations with search
3. **Inventory System** - Stock tracking, batch numbers, expiry dates
4. **Sales Orders** - Order management with basic stages
5. **Products** - Product catalog management
6. **Collections** - Payment collection tracking

---

## ❌ MISSING REQUIREMENTS (Must Implement)

### 1. CRM ENHANCEMENTS
**Customer Fields to Add:**
- ✅ Products distributed/ordered (per customer)
- ✅ Order history & volume aggregation
- ✅ Payment terms (credit_period_days field)
- ✅ Payment status per customer
- ✅ Assigned sales staff (assigned_staff_id field)
- ✅ Supplying distributor for shops (supplier_id field)
- ✅ Order frequency tracking
- ✅ Preferred products tracking

**CRM Shared Features to Add:**
- ✅ Pipeline stages: New Lead → Contacted → Sample Sent → Order Placed → Active Customer
- ✅ Notes/Activity log per customer (calls, visits, complaints)
- ✅ Tagging system (high-value, seasonal, at-risk)
- ✅ Enhanced filters (region, product, payment status, assigned staff)

### 2. SALES LIST (NEW PAGE)
**Create: RimiSalesList.tsx**
- ✅ Unified sales log across all customer types
- ✅ Columns: Customer Name, Type, Products, Quantity, Amount, Date, Payment Status, Staff
- ✅ Filters: Date range, customer type, region, staff, product
- ✅ Sales Dashboard with:
  - Total sales by period
  - Top customers
  - Top products
  - Sales by staff
  - Sales by region
- ✅ Export to CSV/Excel

### 3. ORDER STAGES FIX
**Update RimiSalesOrders.tsx:**
- ✅ Add missing stages: "In Production", "Packing"
- ✅ Complete flow: Order Received → Confirmed → In Production → Packing → Dispatched → Delivered

### 4. DOCUMENT HANDLING (NEW FEATURE)
**Create: RimiDocuments.tsx**
- ✅ Upload/manage: Quality certificates, Batch reports, Delivery challans
- ✅ Link documents to orders, batches, customers
- ✅ Document viewer and download

### 5. TASK ASSIGNMENT SYSTEM (NEW FEATURE)
**Create: RimiTasks.tsx**
- ✅ Task creation by Central/Admin
- ✅ Editable task titles
- ✅ Assignment to staff members
- ✅ Task types: Customer follow-up, Order processing, Delivery coordination, Payment collection
- ✅ Task statuses: To Do → In Progress → Completed
- ✅ Staff view: "Assigned to Me" filter

### 6. 3-TIER PERMISSIONS SYSTEM
**Roles:**
- **Central (super_admin, central):** Full access to ALL features across all apps
- **Admin (rimi_admin, rimi):** Full access within RIMI only
- **Staff (rimi_staff):** Limited to assigned customers, tasks, orders only

**Implementation:**
- ✅ Create RimiStaffDashboard.tsx - limited view
- ✅ Add role checks in all pages
- ✅ Filter data based on assignments for staff
- ✅ Hide admin-only features from staff (Settings, Staff Management, etc.)

---

## 🗑️ FEATURES TO REMOVE (Violate Requirements)

### 1. CUSTOMER LOGIN PORTAL - **MUST DELETE**
**Files to Remove:**
- ❌ DELETE: `src/pages/rimi/RimiCustomerPortal.tsx`
- ❌ REMOVE: Route `/rimi/customer-portal` from App.tsx
- ❌ REMOVE: `rimi_client` role from RIMI_ROLES array
- ❌ REMOVE: Customer login logic from RimiLoginPage.tsx

**Functions to Remove:**
- ❌ DELETE: `provisionRimiCustomerLogin()` from rimi.ts API
- ❌ DELETE: `getRimiCustomerCredentials()` from rimi.ts API
- ❌ REMOVE: All "Provision Login" buttons from Distributors, Retailers, Wholesalers pages
- ❌ REMOVE: Credential modal UI from all customer pages

---

## 📊 DATABASE SCHEMA UPDATES

### rimi_distributors table (UPDATE)
```sql
ALTER TABLE rimi_distributors ADD COLUMN IF NOT EXISTS:
- pipeline_stage TEXT DEFAULT 'New Lead'
- assigned_staff_id UUID REFERENCES users(id)
- payment_terms_days INTEGER DEFAULT 30
- supplier_id UUID REFERENCES rimi_distributors(id)
- tags TEXT[] DEFAULT '{}'
- preferred_products JSONB DEFAULT '[]'
- notes JSONB DEFAULT '[]'
```

### rimi_tasks table (CREATE NEW)
```sql
CREATE TABLE rimi_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT, -- 'follow_up', 'order_processing', 'delivery', 'payment_collection'
  customer_id UUID REFERENCES rimi_distributors(id),
  order_id UUID REFERENCES rimi_sales_orders(id),
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'To Do', -- 'To Do', 'In Progress', 'Completed'
  priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High'
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### rimi_customer_notes table (CREATE NEW)
```sql
CREATE TABLE rimi_customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES rimi_distributors(id) ON DELETE CASCADE,
  note_type TEXT, -- 'call', 'visit', 'complaint', 'note'
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rimi_documents table (CREATE NEW)
```sql
CREATE TABLE rimi_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_type TEXT NOT NULL, -- 'quality_certificate', 'batch_report', 'delivery_challan', 'other'
  doc_title TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  linked_to_type TEXT, -- 'customer', 'order', 'batch'
  linked_to_id UUID,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 IMPLEMENTATION ORDER

### Phase 1: Remove Unwanted Features (PRIORITY 1)
1. ✅ Delete RimiCustomerPortal.tsx
2. ✅ Remove customer portal routes from App.tsx
3. ✅ Remove rimi_client role references
4. ✅ Remove provisionRimiCustomerLogin functions
5. ✅ Clean up customer credential UI from all pages

### Phase 2: Database Schema & API Updates
6. ✅ Update rimi.ts API with new fields
7. ✅ Create task management APIs
8. ✅ Create notes/activity APIs
9. ✅ Create documents APIs

### Phase 3: CRM Enhancements
10. ✅ Add pipeline stages to customer pages
11. ✅ Add notes/activity log modal
12. ✅ Add tagging system
13. ✅ Add assigned staff field
14. ✅ Enhanced filters (region, staff, payment status, product)
15. ✅ Add supplier_id field for shops

### Phase 4: New Features
16. ✅ Create RimiSalesList.tsx (unified sales log + dashboard)
17. ✅ Create RimiTasks.tsx (task assignment system)
18. ✅ Create RimiDocuments.tsx (document management)
19. ✅ Update order stages (add In Production, Packing)

### Phase 5: 3-Tier Permissions
20. ✅ Create rimi_staff role
21. ✅ Create RimiStaffDashboard.tsx
22. ✅ Add permission checks to all pages
23. ✅ Filter data based on assignments for staff
24. ✅ Update RimiLayout with role-based navigation

### Phase 6: Testing & Verification
25. ✅ Test all CRUD operations
26. ✅ Verify permissions work correctly
27. ✅ Test task assignments
28. ✅ Verify no customer login exists
29. ✅ Export functionality testing

---

## ✅ SUCCESS CRITERIA

- [ ] NO customer login portal exists
- [ ] All 3 customer types have complete required fields
- [ ] Pipeline stages work for all customers
- [ ] Notes/activity log per customer
- [ ] Tagging system functional
- [ ] Unified Sales List with filters and dashboard
- [ ] Order stages include: Order Received → Confirmed → In Production → Packing → Dispatched → Delivered
- [ ] Document management operational
- [ ] Task assignment system works
- [ ] 3-tier permissions enforced (Central/Admin/Staff)
- [ ] Staff see only assigned data
- [ ] All features tested and functional

---

**ESTIMATED FILES TO MODIFY:** 25+
**ESTIMATED FILES TO CREATE:** 5+
**ESTIMATED FILES TO DELETE:** 1

**TIME ESTIMATE:** Full implementation = 2-3 hours
