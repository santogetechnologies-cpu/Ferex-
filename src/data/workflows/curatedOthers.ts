import type { AppCurated, FlowLane } from './types';

const lane = (id: string, label: string, roles: string[] = []): FlowLane => ({ id, label, roles });

/* ─────────────────────────────── Rimi Frozen Foods ─────────────────────────────── */
const R = {
  sales: lane('sales', 'Sales', ['rimi', 'rimi_admin', 'rimi_staff']),
  ops: lane('ops', 'Warehouse & operations', ['operations_manager', 'rimi_frozen']),
  delivery: lane('delivery', 'Delivery', ['operations_manager', 'rimi_staff']),
  accounts: lane('accounts', 'Collections', ['rimi_admin']),
  system: lane('system', 'System'),
};

export const rimi: AppCurated = {
  tagline: 'Frozen-food distribution: customers, products and stock, sales orders, delivery trips and the money collected.',
  roleNotes: {
    rimi: 'Rimi division lead. Full access to every Rimi screen.',
    rimi_admin: 'Rimi administrator: customers, orders, stock, deliveries, collections and reports.',
    rimi_frozen: 'Frozen-foods desk: the same screens, working day to day with stock and orders.',
    operations_manager: 'Runs warehouses, vehicles, routes and deliveries.',
    rimi_staff: 'Team member who handles orders, deliveries and tasks.',
  },
  flows: [
    {
      id: 'order-to-cash', title: 'Customer to sales order to cash',
      summary: 'The main money path: a customer orders, stock is reserved, goods are delivered and payment is collected.',
      lanes: [R.sales, R.ops, R.delivery, R.accounts, R.system],
      nodes: [
        { id: 'cust', label: 'Add or find the customer', lane: 'sales', col: 0, kind: 'start', desc: 'Customer directory with type, territory, pipeline stage and activity history.', screens: ['/rimi/customers'], tables: ['rimi_customers', 'rimi_customer_activity'] },
        { id: 'order', label: 'Create the sales order', lane: 'sales', col: 1, desc: 'Pick products and quantities; totals and tax are calculated by the database in one step.', screens: ['/rimi/sales-orders'], tables: ['rimi_sales_orders'] },
        { id: 'stock', label: 'Stock available?', lane: 'ops', col: 2, kind: 'decision', desc: 'The order reserves stock from inventory batches.', screens: ['/rimi/inventory'], tables: ['rimi_inventory_batches'] },
        { id: 'restock', label: 'Add stock / wait', lane: 'ops', col: 3, desc: 'Record incoming stock; movements are logged.', screens: ['/rimi/inventory', '/rimi/warehouses'], tables: ['rimi_stock_movements', 'rimi_warehouses'] },
        { id: 'confirm', label: 'Order confirmed', lane: 'sales', col: 3, desc: 'Status moves Draft → Confirmed.', screens: ['/rimi/sales-orders'], tables: ['rimi_sales_orders'] },
        { id: 'trip', label: 'Plan the delivery trip', lane: 'delivery', col: 4, desc: 'Assign vehicle, driver and route.', screens: ['/rimi/deliveries', '/rimi/vehicles', '/rimi/delivery-routes'], tables: ['rimi_deliveries', 'rimi_vehicles', 'rimi_delivery_routes'] },
        { id: 'dispatch', label: 'Dispatched, then delivered', lane: 'delivery', col: 5, desc: 'Status follows the goods: Dispatched → Delivered.', screens: ['/rimi/deliveries'], tables: ['rimi_deliveries', 'rimi_sales_orders'] },
        { id: 'pay', label: 'Record the payment', lane: 'accounts', col: 6, desc: 'Cash, bank or cheque against the order; the outstanding balance updates.', screens: ['/rimi/collections'], tables: ['rimi_payments'] },
        { id: 'paid', label: 'Order fully paid', lane: 'system', col: 7, kind: 'end', desc: 'Payment status becomes Paid and customer outstanding drops.', tables: ['rimi_sales_orders', 'rimi_customers'] },
      ],
      edges: [
        { from: 'cust', to: 'order' }, { from: 'order', to: 'stock' }, { from: 'stock', to: 'restock', label: 'No' }, { from: 'stock', to: 'confirm', label: 'Yes' },
        { from: 'restock', to: 'confirm' }, { from: 'confirm', to: 'trip' }, { from: 'trip', to: 'dispatch' }, { from: 'dispatch', to: 'pay' }, { from: 'pay', to: 'paid' },
      ],
    },
    {
      id: 'stock-flow', title: 'Products, warehouses and stock',
      summary: 'How goods are described, stored and tracked until they expire or sell.',
      lanes: [R.ops, R.sales, R.system],
      nodes: [
        { id: 'prod', label: 'Create products and categories', lane: 'ops', col: 0, kind: 'start', desc: 'SKU, category, price, unit and storage needs.', screens: ['/rimi/products'], tables: ['rimi_products', 'rimi_product_categories'] },
        { id: 'wh', label: 'Set up warehouses', lane: 'ops', col: 1, desc: 'Locations and capacity.', screens: ['/rimi/warehouses'], tables: ['rimi_warehouses'] },
        { id: 'in', label: 'Receive stock into batches', lane: 'ops', col: 2, desc: 'Batch number, quantity, expiry date.', screens: ['/rimi/inventory'], tables: ['rimi_inventory_batches', 'rimi_stock_movements'] },
        { id: 'sell', label: 'Orders draw stock down', lane: 'sales', col: 3, desc: 'Each order line reduces available stock.', screens: ['/rimi/sales-orders'], tables: ['rimi_sales_orders'] },
        { id: 'exp', label: 'Expiry and low-stock watch', lane: 'system', col: 4, kind: 'end', desc: 'Batches near expiry and low stock are highlighted.', screens: ['/rimi/inventory', '/rimi/dashboard'], tables: ['rimi_inventory_batches'] },
      ],
      edges: [{ from: 'prod', to: 'wh' }, { from: 'wh', to: 'in' }, { from: 'in', to: 'sell' }, { from: 'sell', to: 'exp' }],
    },
    {
      id: 'daily', title: 'Daily operations',
      summary: 'What each person does every day outside the order path.',
      lanes: [R.sales, R.ops, R.system],
      nodes: [
        { id: 'clock', label: 'Clock in and out', lane: 'sales', col: 0, kind: 'start', desc: 'Shared attendance module: clock, leave, verification.', screens: ['/rimi/attendance'], tables: ['attendance_days', 'attendance_leaves'] },
        { id: 'tasks', label: 'Work the task list', lane: 'sales', col: 1, desc: 'Assigned tasks with priority and due date.', screens: ['/rimi/tasks'], tables: ['rimi_tasks'] },
        { id: 'notes', label: 'Notifications and emails', lane: 'ops', col: 2, desc: 'Alerts for orders, stock and payments; email delivery setup.', screens: ['/rimi/notifications', '/rimi/emails'], tables: ['rimi_notifications', 'email_logs'] },
        { id: 'ai', label: 'Ask the AI assistant', lane: 'ops', col: 3, desc: 'Questions about customers, orders and stock.', screens: ['/rimi/ai-copilot'] },
        { id: 'rep', label: 'Reports and finance', lane: 'system', col: 4, kind: 'end', desc: 'Sales, collections and stock summaries.', screens: ['/rimi/analytics', '/rimi/finance'] },
      ],
      edges: [{ from: 'clock', to: 'tasks' }, { from: 'tasks', to: 'notes' }, { from: 'notes', to: 'ai' }, { from: 'ai', to: 'rep' }],
    },
  ],
  dfd: {
    nodes: [
      { id: 'sales', kind: 'actor', label: 'Sales team', col: 0, row: 0, desc: 'Customers and orders.' },
      { id: 'ops', kind: 'actor', label: 'Operations', col: 0, row: 2, desc: 'Stock, vehicles, deliveries.' },
      { id: 'acc', kind: 'actor', label: 'Admin / accounts', col: 0, row: 4, desc: 'Collections and reports.' },
      { id: 'p-ord', kind: 'process', label: 'Take & confirm orders', col: 2, row: 0, desc: 'Create, confirm, cancel orders.', screens: ['/rimi/sales-orders'] },
      { id: 'p-stock', kind: 'process', label: 'Manage stock', col: 2, row: 1, desc: 'Receive, move, expire stock.', screens: ['/rimi/inventory', '/rimi/warehouses'] },
      { id: 'p-del', kind: 'process', label: 'Deliver', col: 2, row: 2, desc: 'Trips, vehicles, routes.', screens: ['/rimi/deliveries'] },
      { id: 'p-col', kind: 'process', label: 'Collect payments', col: 2, row: 4, desc: 'Record and reconcile payments.', screens: ['/rimi/collections'] },
      { id: 's-cust', kind: 'store', label: 'Customers', col: 4, row: 0, desc: 'rimi_customers, activity', tables: ['rimi_customers', 'rimi_customer_activity'] },
      { id: 's-ord', kind: 'store', label: 'Orders', col: 4, row: 1, desc: 'rimi_sales_orders', tables: ['rimi_sales_orders'] },
      { id: 's-stock', kind: 'store', label: 'Products & stock', col: 4, row: 2, desc: 'products, batches, movements, warehouses', tables: ['rimi_products', 'rimi_inventory_batches', 'rimi_stock_movements', 'rimi_warehouses'] },
      { id: 's-del', kind: 'store', label: 'Deliveries', col: 4, row: 3, desc: 'deliveries, vehicles, routes', tables: ['rimi_deliveries', 'rimi_vehicles', 'rimi_delivery_routes'] },
      { id: 's-pay', kind: 'store', label: 'Payments', col: 4, row: 4, desc: 'rimi_payments', tables: ['rimi_payments'] },
      { id: 'x-mail', kind: 'external', label: 'Email provider', col: 6, row: 2, desc: 'Notification emails.' },
    ],
    edges: [
      { from: 'sales', to: 'p-ord', label: 'orders' }, { from: 'p-ord', to: 's-ord', label: 'save' }, { from: 's-cust', to: 'p-ord', label: 'who' }, { from: 'p-ord', to: 's-stock', label: 'reserve' },
      { from: 'ops', to: 'p-stock', label: 'receive' }, { from: 'p-stock', to: 's-stock', label: 'batches' }, { from: 'ops', to: 'p-del', label: 'plan trips' }, { from: 'p-del', to: 's-del', label: 'status' },
      { from: 's-ord', to: 'p-del', label: 'to deliver' }, { from: 'acc', to: 'p-col', label: 'records' }, { from: 'p-col', to: 's-pay', label: 'save' }, { from: 'p-col', to: 's-ord', label: 'paid?' },
      { from: 'p-del', to: 'x-mail', label: 'alerts' },
    ],
  },
};

/* ─────────────────────────────── Ferex Trade ─────────────────────────────── */
const T = {
  sales: lane('sales', 'Trade desk', ['trade', 'trade_admin', 'global_trade']),
  logistics: lane('logistics', 'Logistics', ['logistics_officer']),
  finance: lane('finance', 'Finance', ['trade_admin']),
  partner: lane('partner', 'Partner / buyer'),
  system: lane('system', 'System'),
};

export const trade: AppCurated = {
  tagline: 'Import-export trade: partners, orders and shipments, the paperwork each shipment needs, and getting paid.',
  roleNotes: {
    trade: 'Trade division lead with access to every Trade screen.',
    trade_admin: 'Trade administrator: partners, orders, documents, invoices, payments and reports.',
    global_trade: 'Global trade desk: day-to-day orders and documents.',
    logistics_officer: 'Handles shipments, packing lists, bills of lading and certificates.',
  },
  flows: [
    {
      id: 'order-to-payment', title: 'Partner to shipment to payment',
      summary: 'One export order from first contact to money received.',
      lanes: [T.sales, T.logistics, T.finance, T.partner, T.system],
      nodes: [
        { id: 'partner', label: 'Add the partner', lane: 'sales', col: 0, kind: 'start', desc: 'Partner (buyer/supplier) profile, contacts and terms.', screens: ['/trade/crm'], tables: ['trade_clients'] },
        { id: 'order', label: 'Create the order / shipment', lane: 'sales', col: 1, desc: 'Goods, quantity, ports, ETD/ETA and status.', screens: ['/trade/shipments'], tables: ['trade_orders'] },
        { id: 'pack', label: 'Packing list', lane: 'logistics', col: 2, desc: 'Contents per package, weights and marks.', screens: ['/trade/packing-lists'], tables: ['trade_packing_lists'] },
        { id: 'inv', label: 'Commercial invoice', lane: 'finance', col: 3, desc: 'Amount, currency, terms; status Draft → Sent → Paid.', screens: ['/trade/invoices'], tables: ['trade_invoices'] },
        { id: 'lc', label: 'Letter of credit needed?', lane: 'finance', col: 4, kind: 'decision', desc: 'Some buyers pay through a letter of credit.' },
        { id: 'lcdoc', label: 'Letter of credit', lane: 'finance', col: 5, desc: 'Issuing bank, amount, expiry and documents required.', screens: ['/trade/letters-of-credit'], tables: ['trade_letters_of_credit'] },
        { id: 'bl', label: 'Bill of lading', lane: 'logistics', col: 5, desc: 'The carrier\'s receipt and title to goods.', screens: ['/trade/bills-of-lading'], tables: ['trade_bills_of_lading'] },
        { id: 'cert', label: 'Certificates', lane: 'logistics', col: 6, desc: 'Origin, quality and other certificates.', screens: ['/trade/certificates'], tables: ['trade_certificates'] },
        { id: 'docs', label: 'Document vault', lane: 'logistics', col: 7, desc: 'All files for the shipment in one place.', screens: ['/trade/documents'], tables: ['trade_documents'] },
        { id: 'ship', label: 'Goods shipped, in transit', lane: 'system', col: 8, kind: 'system', desc: 'Shipment status updates and notifications.', tables: ['trade_orders', 'trade_notifications'] },
        { id: 'pay', label: 'Payment received', lane: 'finance', col: 9, kind: 'end', desc: 'Advance or balance payments against the invoice.', screens: ['/trade/payments'], tables: ['trade_payments'] },
      ],
      edges: [
        { from: 'partner', to: 'order' }, { from: 'order', to: 'pack' }, { from: 'pack', to: 'inv' }, { from: 'inv', to: 'lc' }, { from: 'lc', to: 'lcdoc', label: 'Yes' }, { from: 'lc', to: 'bl', label: 'No' },
        { from: 'lcdoc', to: 'bl' }, { from: 'bl', to: 'cert' }, { from: 'cert', to: 'docs' }, { from: 'docs', to: 'ship' }, { from: 'ship', to: 'pay' },
      ],
    },
    {
      id: 'support-tasks', title: 'Tasks, support and reporting',
      summary: 'How the team keeps work moving and reviews results.',
      lanes: [T.sales, T.logistics, T.system],
      nodes: [
        { id: 'clock', label: 'Clock in and out', lane: 'sales', col: 0, kind: 'start', desc: 'Attendance, leave and verification.', screens: ['/trade/attendance'], tables: ['attendance_days'] },
        { id: 'tasks', label: 'Tasks', lane: 'sales', col: 1, desc: 'Assigned work with priorities and due dates.', screens: ['/trade/tasks'], tables: ['trade_tasks'] },
        { id: 'tickets', label: 'Support tickets', lane: 'logistics', col: 2, desc: 'Issues raised by partners or the team and their replies.', screens: ['/trade/tickets'], tables: ['trade_tickets'] },
        { id: 'notes', label: 'Notifications and emails', lane: 'logistics', col: 3, desc: 'Alerts and email delivery setup.', screens: ['/trade/notifications', '/trade/emails'], tables: ['trade_notifications', 'email_logs'] },
        { id: 'rep', label: 'Reports and analytics', lane: 'system', col: 4, kind: 'end', desc: 'Shipment and finance reports, with exports.', screens: ['/trade/reports', '/trade/shipment-analytics', '/trade/financial-analytics'] },
      ],
      edges: [{ from: 'clock', to: 'tasks' }, { from: 'tasks', to: 'tickets' }, { from: 'tickets', to: 'notes' }, { from: 'notes', to: 'rep' }],
    },
  ],
  dfd: {
    nodes: [
      { id: 'desk', kind: 'actor', label: 'Trade desk', col: 0, row: 0, desc: 'Partners, orders, invoices.' },
      { id: 'log', kind: 'actor', label: 'Logistics officer', col: 0, row: 2, desc: 'Shipping paperwork.' },
      { id: 'fin', kind: 'actor', label: 'Finance', col: 0, row: 4, desc: 'Invoices and payments.' },
      { id: 'p-ord', kind: 'process', label: 'Manage orders', col: 2, row: 0, desc: 'Create and track orders.', screens: ['/trade/shipments', '/trade/crm'] },
      { id: 'p-docs', kind: 'process', label: 'Prepare shipping documents', col: 2, row: 2, desc: 'Packing list, B/L, certificates.', screens: ['/trade/packing-lists', '/trade/bills-of-lading', '/trade/certificates', '/trade/documents'] },
      { id: 'p-bill', kind: 'process', label: 'Invoice & collect', col: 2, row: 4, desc: 'Invoices, L/C, payments.', screens: ['/trade/invoices', '/trade/letters-of-credit', '/trade/payments'] },
      { id: 's-cli', kind: 'store', label: 'Partners', col: 4, row: 0, desc: 'trade_clients', tables: ['trade_clients'] },
      { id: 's-ord', kind: 'store', label: 'Orders', col: 4, row: 1, desc: 'trade_orders', tables: ['trade_orders'] },
      { id: 's-doc', kind: 'store', label: 'Shipping documents', col: 4, row: 2, desc: 'packing lists, bills of lading, certificates, documents', tables: ['trade_packing_lists', 'trade_bills_of_lading', 'trade_certificates', 'trade_documents'] },
      { id: 's-fin', kind: 'store', label: 'Invoices & payments', col: 4, row: 4, desc: 'trade_invoices, trade_payments, trade_letters_of_credit', tables: ['trade_invoices', 'trade_payments', 'trade_letters_of_credit'] },
      { id: 'x-bank', kind: 'external', label: 'Bank / buyer', col: 6, row: 4, desc: 'Pays against the invoice or letter of credit.' },
    ],
    edges: [
      { from: 'desk', to: 'p-ord', label: 'orders' }, { from: 'p-ord', to: 's-cli', label: 'partner' }, { from: 'p-ord', to: 's-ord', label: 'save' }, { from: 's-ord', to: 'p-docs', label: 'to ship' },
      { from: 'log', to: 'p-docs', label: 'prepare' }, { from: 'p-docs', to: 's-doc', label: 'files' }, { from: 's-ord', to: 'p-bill', label: 'to bill' }, { from: 'fin', to: 'p-bill', label: 'invoice' },
      { from: 'p-bill', to: 's-fin', label: 'record' }, { from: 'x-bank', to: 'p-bill', label: 'payment' },
    ],
  },
};

/* ─────────────────────────────── Ferex Digital ─────────────────────────────── */
const D = {
  admin: lane('admin', 'Digital admin', ['digital', 'digital_admin', 'ferex_digital']),
  pm: lane('pm', 'Project manager', ['project_manager', 'digital_manager', 'digimanager', 'pm', 'digital_pm']),
  staff: lane('staff', 'Team member', ['digital_staff', 'designer', 'developer']),
  client: lane('client', 'Client', ['digital_client']),
  system: lane('system', 'System'),
};

export const digital: AppCurated = {
  tagline: 'Digital agency: leads become clients and projects, delivery is run by project managers, and billing follows the agreed milestones.',
  roleNotes: {
    digital: 'Digital division lead (same as admin).',
    digital_admin: 'Runs the agency: clients, leads, projects, billing, payments, expenses, settings and reports.',
    ferex_digital: 'Digital administrator (same as admin).',
    digital_director: 'Director-level access to the agency screens (not to billing or settings).',
    digital_manager: 'Project manager desk, with agency screens for their projects.',
    project_manager: 'Runs delivery for the projects assigned to them: sprints, tickets, milestones and deliverables. Sees payment status, never amounts.',
    digimanager: 'Project manager (same access).', pm: 'Project manager (same access).', digital_pm: 'Project manager desk only.',
    account_manager: 'Account manager: client-facing work on their projects.', accountmanager: 'Account manager (same access).',
    digital_account_manager: 'Account manager (same access).', account_executive: 'Account executive (same access).', client_manager: 'Client manager (same access).',
    digital_staff: 'Team member: tasks and deliverables on assigned projects.', designer: 'Designer: assigned tasks and deliverables.', developer: 'Developer: assigned tasks and deliverables.',
    digital_client: 'The client. Sees only their own projects, milestones, payments, documents and receipts in the client portal.',
  },
  flows: [
    {
      id: 'lead-to-project', title: 'Lead to client to project',
      summary: 'How an enquiry becomes paid-for work.',
      lanes: [D.admin, D.pm, D.client, D.system],
      nodes: [
        { id: 'lead', label: 'Capture the lead', lane: 'admin', col: 0, kind: 'start', desc: 'Company, contact, value, source and stage; categories are shared lists.', screens: ['/digital/leads'], tables: ['digital_clients', 'digital_settings'] },
        { id: 'qual', label: 'Qualified?', lane: 'admin', col: 1, kind: 'decision', desc: 'Move the lead through its stages.' },
        { id: 'lost', label: 'Closed lost', lane: 'admin', col: 2, kind: 'end', desc: 'Kept for history.', screens: ['/digital/leads'] },
        { id: 'convert', label: 'Convert to client and project', lane: 'admin', col: 2, desc: 'One step creates the client and the first project.', screens: ['/digital/leads', '/digital/clients'], tables: ['digital_clients', 'digital_projects'] },
        { id: 'assign', label: 'Assign a project manager', lane: 'admin', col: 3, desc: 'Only registered team members can be assigned.', screens: ['/digital/projects'], tables: ['digital_projects'] },
        { id: 'invite', label: 'Invite the client to the portal', lane: 'admin', col: 4, desc: 'The client sets their own password from an email invitation.', screens: ['/digital/clients'], tables: ['digital_client_users'], functions: ['provision-digital-user'] },
        { id: 'portal', label: 'Client follows progress', lane: 'client', col: 5, kind: 'end', desc: 'Projects, milestones, balances, deliverables and receipts.', screens: ['/digital/client-portal'], tables: ['digital_projects', 'digital_contracts'] },
      ],
      edges: [{ from: 'lead', to: 'qual' }, { from: 'qual', to: 'lost', label: 'No' }, { from: 'qual', to: 'convert', label: 'Yes' }, { from: 'convert', to: 'assign' }, { from: 'assign', to: 'invite' }, { from: 'invite', to: 'portal' }],
    },
    {
      id: 'billing', title: 'Billing, payments and receipts',
      summary: 'From the agreed price to money received, with milestones and part payments.',
      lanes: [D.admin, D.client, D.system],
      nodes: [
        { id: 'settings', label: 'Agency, taxes and term templates set', lane: 'admin', col: 0, kind: 'start', desc: 'Name, address, tax number, payment instructions, tax rules by country, services and milestone templates.', screens: ['/digital/settings'], tables: ['digital_commerce_settings'] },
        { id: 'config', label: 'Configure the project\'s billing', lane: 'admin', col: 1, desc: 'Services, tax, and a milestone split that must total 100%.', screens: ['/digital/billing'], tables: ['digital_contracts'] },
        { id: 'proposal', label: 'Proposal issued', lane: 'admin', col: 2, desc: 'A printable proposal; emailed to the client.', screens: ['/digital/invoices'], tables: ['digital_financial_documents', 'digital_mail_outbox'], functions: ['send-digital-document'] },
        { id: 'due', label: 'Milestone due', lane: 'system', col: 3, kind: 'system', desc: 'Delivery milestones linked to a payment term raise an invoice reminder; overdue terms are flagged every morning.', tables: ['digital_milestones', 'digital_notifications'] },
        { id: 'invoice', label: 'Invoice for the milestone', lane: 'admin', col: 4, desc: 'Invoice per term, printed or emailed.', screens: ['/digital/invoices', '/digital/billing'], tables: ['digital_financial_documents'] },
        { id: 'pay', label: 'Client pays (any amount up to the balance)', lane: 'client', col: 5, desc: 'Paid offline by bank, UPI or card; the client sees balance per milestone.', screens: ['/digital/client-portal'] },
        { id: 'record', label: 'Admin records the payment', lane: 'admin', col: 6, desc: 'Method, date and reference; safe against double entry. A receipt is created and emailed.', screens: ['/digital/payments'], tables: ['digital_collections', 'digital_financial_documents'] },
        { id: 'more', label: 'Fully paid?', lane: 'system', col: 7, kind: 'decision', desc: 'The project\'s payment status follows the amounts received.' },
        { id: 'scope', label: 'Extra scope or refund', lane: 'admin', col: 8, desc: 'Extra scope adds new terms without touching issued ones; refunds create credit notes.', screens: ['/digital/billing', '/digital/payments'], tables: ['digital_refunds', 'digital_contracts'] },
        { id: 'done', label: 'Closed: reports updated', lane: 'system', col: 9, kind: 'end', desc: 'Dashboards and Central report money actually received.', screens: ['/digital/dashboard'] },
      ],
      edges: [
        { from: 'settings', to: 'config' }, { from: 'config', to: 'proposal' }, { from: 'proposal', to: 'due' }, { from: 'due', to: 'invoice' }, { from: 'invoice', to: 'pay' }, { from: 'pay', to: 'record' },
        { from: 'record', to: 'more' }, { from: 'more', to: 'invoice', label: 'No' }, { from: 'more', to: 'done', label: 'Yes' }, { from: 'record', to: 'scope', label: 'Change' }, { from: 'scope', to: 'config' },
      ],
    },
    {
      id: 'delivery', title: 'Project delivery',
      summary: 'How the work gets done and linked back to payment.',
      lanes: [D.pm, D.staff, D.client, D.system],
      nodes: [
        { id: 'mine', label: 'My projects', lane: 'pm', col: 0, kind: 'start', desc: 'Only projects assigned to this manager.', screens: ['/digital/pm/projects', '/digital/pm/dashboard'], tables: ['digital_projects'] },
        { id: 'sprint', label: 'Plan sprints', lane: 'pm', col: 1, desc: 'Sprint name, goal, dates and status.', screens: ['/digital/pm/sprints'], tables: ['digital_sprints'] },
        { id: 'tasks', label: 'Assign tasks', lane: 'staff', col: 2, desc: 'Tasks with priority and status; team members update progress.', screens: ['/digital/tasks', '/digital/pm/sprints'], tables: ['digital_tasks'] },
        { id: 'mile', label: 'Milestones linked to payment terms', lane: 'pm', col: 3, desc: 'Approving a linked milestone tells the admin to invoice its term. The manager sees term names and status, not amounts.', screens: ['/digital/pm/milestones'], tables: ['digital_milestones'] },
        { id: 'deliver', label: 'Deliverables shared', lane: 'staff', col: 4, desc: 'Links to files and demos, reviewed before release.', screens: ['/digital/deliverables', '/digital/pm/documents'], tables: ['digital_deliverables'] },
        { id: 'tickets', label: 'Client tickets', lane: 'pm', col: 5, desc: 'Issues raised during or after delivery.', screens: ['/digital/pm/tickets'], tables: ['digital_tickets'] },
        { id: 'client', label: 'Client reviews', lane: 'client', col: 6, kind: 'end', desc: 'Sees progress, deliverables and milestones in the portal.', screens: ['/digital/client-portal'] },
      ],
      edges: [{ from: 'mine', to: 'sprint' }, { from: 'sprint', to: 'tasks' }, { from: 'tasks', to: 'mile' }, { from: 'mile', to: 'deliver' }, { from: 'deliver', to: 'tickets' }, { from: 'tickets', to: 'client' }],
    },
    {
      id: 'agency-ops', title: 'Meetings, expenses and the team',
      summary: 'Everything that supports the agency day to day.',
      lanes: [D.admin, D.pm, D.system],
      nodes: [
        { id: 'meet', label: 'Schedule client meetings', lane: 'admin', col: 0, kind: 'start', desc: 'Host, platform, agenda and link; managers see their own.', screens: ['/digital/meetings'], tables: ['digital_meetings'] },
        { id: 'exp', label: 'Log expenses and assets', lane: 'admin', col: 1, desc: 'Category, vendor, amount and renewal dates for assets.', screens: ['/digital/expenses'], tables: ['digital_expenses', 'digital_assets'] },
        { id: 'att', label: 'Attendance and leave', lane: 'pm', col: 2, desc: 'Clock in/out, leave requests, approvals.', screens: ['/digital/attendance', '/digital/pm/attendance'], tables: ['attendance_days', 'attendance_leaves'] },
        { id: 'notes', label: 'Notifications', lane: 'system', col: 3, kind: 'system', desc: 'Billing, task and project alerts per person.', screens: ['/digital/notifications', '/digital/pm/notifications'], tables: ['digital_notifications'] },
        { id: 'rep', label: 'Reports', lane: 'admin', col: 4, kind: 'end', desc: 'Revenue, projects and team reports.', screens: ['/digital/reports', '/digital/dashboard'] },
      ],
      edges: [{ from: 'meet', to: 'exp' }, { from: 'exp', to: 'att' }, { from: 'att', to: 'notes' }, { from: 'notes', to: 'rep' }],
    },
  ],
  dfd: {
    nodes: [
      { id: 'admin', kind: 'actor', label: 'Digital admin', col: 0, row: 0, desc: 'Leads, billing, settings.' },
      { id: 'pm', kind: 'actor', label: 'Project manager / team', col: 0, row: 2, desc: 'Delivery work.' },
      { id: 'client', kind: 'actor', label: 'Client', col: 0, row: 4, desc: 'Reads progress and balances.' },
      { id: 'p-crm', kind: 'process', label: 'Leads, clients & projects', col: 2, row: 0, desc: 'Convert leads, create projects.', screens: ['/digital/leads', '/digital/clients', '/digital/projects'] },
      { id: 'p-bill', kind: 'process', label: 'Bill & collect', col: 2, row: 1, desc: 'Contracts, invoices, payments, refunds.', screens: ['/digital/billing', '/digital/invoices', '/digital/payments'] },
      { id: 'p-del', kind: 'process', label: 'Deliver the work', col: 2, row: 2, desc: 'Sprints, tasks, milestones, deliverables.', screens: ['/digital/pm/sprints', '/digital/tasks', '/digital/pm/milestones'] },
      { id: 'p-portal', kind: 'process', label: 'Client portal', col: 2, row: 4, desc: 'Read-only view of their projects.', screens: ['/digital/client-portal'] },
      { id: 's-crm', kind: 'store', label: 'Clients & projects', col: 4, row: 0, desc: 'digital_clients, digital_projects', tables: ['digital_clients', 'digital_projects', 'digital_client_users'] },
      { id: 's-bill', kind: 'store', label: 'Billing ledger', col: 4, row: 1, desc: 'contracts, collections, documents, refunds', tables: ['digital_contracts', 'digital_collections', 'digital_financial_documents', 'digital_refunds'] },
      { id: 's-work', kind: 'store', label: 'Delivery', col: 4, row: 2, desc: 'tasks, sprints, milestones, deliverables, tickets', tables: ['digital_tasks', 'digital_sprints', 'digital_milestones', 'digital_deliverables', 'digital_tickets'] },
      { id: 's-conf', kind: 'store', label: 'Settings', col: 4, row: 3, desc: 'digital_commerce_settings, digital_settings', tables: ['digital_commerce_settings', 'digital_settings'] },
      { id: 'x-mail', kind: 'external', label: 'Email (Resend)', col: 6, row: 1, desc: 'Proposals, invoices, receipts.' },
    ],
    edges: [
      { from: 'admin', to: 'p-crm', label: 'leads' }, { from: 'p-crm', to: 's-crm', label: 'save' }, { from: 'admin', to: 'p-bill', label: 'bill' }, { from: 's-conf', to: 'p-bill', label: 'taxes, terms' },
      { from: 'p-bill', to: 's-bill', label: 'ledger' }, { from: 'p-bill', to: 'x-mail', label: 'documents' }, { from: 'pm', to: 'p-del', label: 'plans' }, { from: 'p-del', to: 's-work', label: 'save' },
      { from: 's-work', to: 'p-bill', label: 'milestone approved' }, { from: 's-crm', to: 'p-portal', label: 'projects' }, { from: 's-bill', to: 'p-portal', label: 'balances' }, { from: 'p-portal', to: 'client', label: 'view' },
    ],
  },
};
