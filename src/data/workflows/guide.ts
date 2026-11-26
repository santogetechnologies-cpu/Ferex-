// Plain-language operating guide for each app. The screens, buttons and fields themselves are read from the app's own code
// (inventory.generated.json), so they can never be missing. This file adds what code cannot say: what each menu is for,
// each person's daily routine, what can be customised and where, and the questions people ask most.
import type { AppKey } from './types';

export interface GuideRoutine { who: string; title: string; steps: string[] }
export interface GuideCustomization { title: string; where: string; what: string[] }
export interface GuideApp {
  signIn: string[];
  /** What each menu entry is for. Keyed by the menu name exactly as it appears in the sidebar. */
  menuNotes: Record<string, string>;
  routines: GuideRoutine[];
  customization: GuideCustomization[];
  faq: { q: string; a: string }[];
}

const education: GuideApp = {
  signIn: [
    'Open the portal address and go to Sign in. Everyone uses the same page; the app takes each person to their own area by role.',
    'Students are created when a counselor closes an enquiry (it asks for the student\'s real email). The student receives an email with the login.',
    'Staff, counselors and administrators are created only by Central under Roles & Users. A first-time login asks for a new password.',
    'Forgot password: use the link on the sign-in page; a reset email is sent and the link works once.',
  ],
  menuNotes: {
    Dashboard: 'Your starting point: totals, what needs attention today and shortcuts to the busiest screens.',
    Universities: 'The directory of partner universities by country. Add or edit universities, programs, fees and pictures. Students choose from this list.',
    Destinations: 'The countries you recruit for. Pick a country to see its universities and rules.',
    Enquiries: 'Every enquiry from the public study-abroad form. Assign a counselor, call, update the status and, when the student is serious, close it to create their account.',
    Students: 'All students with their country, counselor, plan and progress. Open a student to see everything about them in one drawer, including their payment plan tags.',
    Applications: 'University applications for every student: status, offer, documents. Counselors update the status as the university replies.',
    Documents: 'Student documents grouped by student: view, approve, reject with a reason or ask for a re-upload. Staff can also upload on the student\'s behalf.',
    'Document Requirements': 'Defines which documents each country needs. Changes appear in every student\'s checklist at once.',
    'Document Verification': 'The review queue: only students who have documents waiting to be checked.',
    'Offer Letters': 'Upload and publish offer letters. The student is notified and sees the letter in their portal.',
    Legalization: 'Tracks document legalization (for example NAWA for Poland) per student and country, with a status you update.',
    Fees: 'Fee setup: registration fee, agency fee, visa-documents fee, extra fees, country-specific amounts, and tax settings.',
    'Payment plans': 'Choose each student\'s flow: Normal (individual fees) or a Country Package. Give discounts per fee here too.',
    Payments: 'Student-first payment desk: pick a student, see every fee, record cash/UPI/bank/card payments (split if needed), verify pending payments, start refunds.',
    Overview: 'Finance summary: collected this month, waiting for verification, still to collect, GST and discounts, with charts.',
    Billing: 'Who still owes what: students with open fees under their confirmed plan.',
    Invoices: 'Every invoice and receipt issued automatically when a payment is verified. Search, preview and print or save as PDF.',
    Expenses: 'Record and review Education expenses; paid payroll appears here automatically.',
    Visa: 'Visa applications and decisions, with VFS appointment status the student also sees.',
    'Pre-Departure': 'Flight, accommodation, insurance and arrival checklist for students who are leaving.',
    Tasks: 'Work assigned to people. Admins assign; the assignee sees a new-task count and updates the status.',
    Support: 'Support tickets from students. Reply, assign and close.',
    Chat: 'Direct messages between students and the team.',
    Attendance: 'Clock in and out, apply for leave, and (for admins) verify attendance, approve leave, run incentives and payroll.',
    Meetings: 'Schedule and track advisory meetings with students.',
    Reports: 'Counselor performance, conversion and activity reports.',
    Emails: 'The log of automatic emails the system sent and their templates.',
    Settings: 'Organisation profile, the enquiry form fields, WhatsApp automation and password security.',
    'My Journey': 'The student\'s roadmap from enquiry to arrival, with a button on each stage that opens the right page.',
    'Service Agreement': 'The agreement the student reads and signs. Signing unlocks the next stages.',
    Receipts: 'The student\'s payment receipts to download or print.',
    Notifications: 'Alerts about offers, payments, documents and visa updates.',
    Profile: 'Personal details and password change.',
  },
  routines: [
    { who: 'Counselor / staff', title: 'A normal day for a counselor', steps: [
      'Clock in under Attendance.', 'Open Enquiries: call the newest enquiries assigned to you and update each status (interested, not interested, follow up).',
      'When a student is serious, close the enquiry and enter their real email: the student account and login email are created.',
      'Open Students and Documents: review uploaded documents, approve or reject with a reason.', 'Update Applications as universities respond; upload offer letters under Offer Letters.',
      'Check Tasks and Meetings, then clock out with a short summary.'] },
    { who: 'Education admin', title: 'Setting a student up to pay', steps: [
      'Open Payment plans and pick the student.', 'Choose Normal flow (individual fees) or a Country Package (for example Poland Basic, Plus or Premium).',
      'Add a discount to any fee if agreed, with a reason.', 'The student now sees only the fees of that plan. Until a plan is confirmed they see just the registration fee.',
      'Record offline payments under Payments; online payments are verified automatically.'] },
    { who: 'Education admin', title: 'Collecting and verifying a payment', steps: [
      'Open Payments and pick the student.', 'Click Record payment on the fee. Choose method (UPI, Google Pay, PhonePe, cards, net banking, bank transfer, cash, cheque), amount, reference and date.',
      'Use Split to enter more than one method for one fee; the parts must add up exactly.', 'A student\'s own UPI/online payment waits under "to verify": approve or reject it with a reason.',
      'A verified payment creates the invoice and receipt automatically. To refund, use Initiate refund on that payment, then Complete refund to issue the credit note.'] },
    { who: 'Education admin', title: 'Month-end finance check', steps: [
      'Finance → Overview: check collected, waiting for verification and still to collect.', 'Finance → Billing: chase students with open fees.',
      'Finance → Invoices: filter by date, print or export what accounting needs.', 'Finance → Expenses: confirm expenses and paid payroll.'] },
    { who: 'Student', title: 'From first login to boarding the flight', steps: [
      'Sign in and open My Journey.', 'Read and sign the Service Agreement.', 'Pay the registration fee under Payments.', 'Upload every document on the checklist under Documents.',
      'Choose universities under Universities and follow Applications.', 'When the offer arrives, open Offer Letters; pay the next fees as they unlock.', 'Track Visa, then complete Pre-Departure (flight, accommodation, insurance, arrival checklist).'] },
  ],
  customization: [
    { title: 'Enquiry form', where: 'Settings → Lead Form Configuration', what: ['Add, remove or rename the questions on the public study-abroad form.', 'Choose which are required and the answer options of dropdowns.', 'Changes show on the public form immediately.'] },
    { title: 'WhatsApp greetings', where: 'Settings → WhatsApp API & Automation', what: ['Switch automatic greetings on or off.', 'Meta is the provider; the access token and phone number ID are kept as secure server secrets, not typed here.', 'Enter the approved template name and language so new enquirers receive it (WhatsApp only allows templates to people who have not messaged you first).', 'Send a test message to your own number.'] },
    { title: 'Fees', where: 'Fees', what: ['Registration, agency and visa-documents fees, plus any custom fee.', 'Different amounts per country, currency, timing (before or after a stage) and tax percentage.', 'Fees paid to third parties (VFS, universities) are shown as information, never collected.'] },
    { title: 'Country packages', where: 'Fees → Country package builder', what: ['Unlimited packages per country: name, price, currency, description, specialization.', 'Benefits, deliverables, covered services and journey milestones.', 'GST on or off, a percentage, inclusive or exclusive.', 'A separate registration fee toggle and amount; the instalments then cover the rest. Instalments are editable with due dates.', 'Terms and an active/inactive switch (new packages start inactive).'] },
    { title: 'Payment plans and discounts', where: 'Payment plans', what: ['Per student: Normal flow or a package.', 'Percent or amount discount per fee, with a reason.'] },
    { title: 'Universities, destinations and documents', where: 'Universities, Document Requirements', what: ['Add universities, programs and images; import in bulk.', 'Set which documents each country needs.'] },
    { title: 'Payment methods and gateway', where: 'Payments, Settings', what: ['Offline and online methods are offered in every payment form.', 'Online card/UPI payments run through Razorpay; keys are kept as secure server secrets.'] },
    { title: 'People and access', where: 'Central → Roles & Users', what: ['Only Central creates staff, counselor and admin logins and sends password reset emails.'] },
  ],
  faq: [
    { q: 'A student says they cannot pay.', a: 'Check Payment plans: until a plan is confirmed they can only pay the registration fee. Confirm Normal or a package.' },
    { q: 'An online payment shows pending.', a: 'Open Payments, find the student, and use the verification list. Razorpay payments confirm themselves; UPI/bank payments need your approval.' },
    { q: 'How do I give a discount?', a: 'Payment plans → the student → the fee → discount percent or amount and a reason. The student and invoices show the discounted amount.' },
    { q: 'How do I print an invoice?', a: 'Finance → Invoices → Print on the row. A preview opens first; press Print / Save as PDF.' },
    { q: 'Where do I see who handled an enquiry?', a: 'Open the enquiry: the activity log lists every call, status change and WhatsApp message with who did it.' },
  ],
};

const rimi: GuideApp = {
  signIn: [
    'Sign in on the common sign-in page. Rimi administrators and warehouse/operations users land on the Rimi dashboard.',
    'Logins are created by Central under Roles & Users. Warehouse and operations users cannot see Finance.',
  ],
  menuNotes: {
    Dashboard: 'Today at a glance: orders, stock alerts, deliveries and collections.',
    'AI Assistant': 'Ask questions about your data in plain words.',
    Customers: 'Shops and distributors with contact person, phone, delivery address, PIN code, credit limit and terms. The delivery details here are used automatically when you dispatch.',
    'Sales Orders': 'Create orders from a customer\'s products, choose batches, edit a confirmed order, and track it from received to delivered.',
    Collections: 'Record payments received from customers against orders and print receipts, product by product if needed.',
    Billing: 'What each order was billed, collected and is still due, with an Invoice button that previews the bill before printing.',
    Payments: 'Same as Collections: the place to record and review customer payments.',
    Expenses: 'Record Rimi expenses; paid payroll appears automatically.',
    Products: 'The product list: unit, price, temperature, reorder level and categories. View SKU Specs shows the live available stock.',
    Inventory: 'Stock by batch with expiry. The Shelf Life column is sorted with the soonest expiry first.',
    Warehouses: 'Cold storage locations and pallet occupancy. Each batch takes its own pallets (500 units per pallet), and an emptied batch frees them.',
    'Dispatch Reefer Truck': 'Dispatch is never automatic. Choose the order, the reefer truck and the driver, review the customer\'s delivery details and confirm.',
    'Reefer Fleet': 'Your trucks, their status and drivers.',
    'Delivery Routes': 'Planned routes and regions.',
    Attendance: 'Clock in/out, leave, and verification by the administrator.',
    Reports: 'Sales, stock and collections reports.',
    Tasks: 'Tasks assigned to team members.',
    Notifications: 'Alerts about orders, stock and deliveries.',
    Emails: 'Log of automatic emails to customers.',
    Profile: 'Your details and password.',
  },
  routines: [
    { who: 'Sales / warehouse', title: 'Taking an order and getting it delivered', steps: [
      'Customers: add the customer once, with the delivery address, contact person, phone and PIN code.', 'Sales Orders: create the order, pick products and the batch to take stock from; the system checks stock and expiry.',
      'Warehouse picks the goods; the order status moves forward.', 'Dispatch Reefer Truck: pick the order, choose the truck and driver, check the shown shop, address, contact and phone, add instructions, confirm.',
      'The driver sees the trip details and marks it In Transit, then Delivered.'] },
    { who: 'Accounts / admin', title: 'Collecting money', steps: [
      'Collections: choose the order, record amount, method and reference.', 'A receipt is created; the order shows Paid in full or Partially paid.',
      'Finance → Billing: see what is still due per customer; use the Invoice button to preview and print the bill.'] },
    { who: 'Warehouse', title: 'Stock and expiry', steps: [
      'Products: add the product and its opening stock with a batch and expiry date.', 'Inventory: review batches; the ones closest to expiry are at the top.',
      'Warehouses: check pallet use per cold room before receiving more stock.'] },
  ],
  customization: [
    { title: 'Products and categories', where: 'Products', what: ['Add categories, set units (KG, cases and so on), price, storage temperature and reorder level.'] },
    { title: 'Customers', where: 'Customers', what: ['Type (distributor, retailer, wholesaler, HORECA), credit limit and credit period, delivery address and PIN.'] },
    { title: 'Warehouses and fleet', where: 'Warehouses, Reefer Fleet', what: ['Capacity in pallets, temperature, manager; trucks and their drivers.'] },
    { title: 'People and access', where: 'Central → Roles & Users', what: ['Rimi administrators see Finance; warehouse and operations roles run daily work only.'] },
  ],
  faq: [
    { q: 'Why was nothing dispatched automatically?', a: 'By design. A dispatcher must pick the truck and driver and confirm.' },
    { q: 'Where is the Invoices menu?', a: 'Invoices are printed from Finance → Billing with the Invoice button.' },
    { q: 'A customer has no address in dispatch.', a: 'Open Customers, edit the customer and fill the Delivery Address and PIN code.' },
  ],
};

const trade: GuideApp = {
  signIn: [
    'Sign in on the common sign-in page. Trade administrators and logistics officers land on the Trade dashboard.',
    'Logins are created by Central under Roles & Users. Only the Trade administrator can reassign tasks.',
  ],
  menuNotes: {
    Dashboard: 'Total order value and balance to collect in every currency, shipments in transit and open work. Each card opens its page.',
    'AI Assistant': 'Ask questions about orders and payments in plain words.',
    Orders: 'Every export/import order: partner, commodity, incoterm, value, advance and balance, shipping details and stage from inquiry to delivered.',
    Attendance: 'Clock in/out and leave. Leave requests from logistics appear as a count for the Trade administrator, who approves or rejects them.',
    Documents: 'Shipping and compliance documents for each order.',
    Tasks: 'Work assigned to logistics. New assignments show as a count; status goes Pending → In Process → Delivered and Delivered is final.',
    Support: 'Partner support tickets.',
    Billing: 'Billed, collected, still due and overdue per currency, with filters, status tabs, Export and Quick Insights.',
    Invoices: 'Commercial invoices. Settle an invoice by recording the payment method and amount.',
    Payments: 'Record advances, balances and settlements. A payment can never take an order past its total.',
    Expenses: 'Trade expenses.',
    Emails: 'Automatic emails sent to partners.',
    Notifications: 'The log of automatic notifications and alerts.',
    Partners: 'Buyers and suppliers with contacts, country, payment terms and credit limit.',
    Profile: 'Your details and password.',
  },
  routines: [
    { who: 'Trade administrator', title: 'From new partner to money received', steps: [
      'Partners: add the buyer or supplier.', 'Orders: create the order with commodity, incoterm, currency, total value and advance percentage.',
      'Assign the logistics officer; they see it as a new task.', 'Documents: upload and verify the shipping documents.',
      'Move the order stage as goods ship (Shipped, Customs Clearance, Delivered).', 'Payments: record the advance when received, then the balance. Use Invoices → Settle for invoice payments.',
      'Billing shows when the order is Settled; Overdue shows money still owed 30 days after delivery.'] },
    { who: 'Logistics officer', title: 'Daily work', steps: [
      'Clock in. Open Tasks and clear the new-task count by opening the page.', 'Move each task Pending → In Process → Delivered. You cannot reassign tasks or move Delivered back.',
      'Update shipment details and documents on your orders. Apply for leave under Attendance; the administrator is notified.'] },
  ],
  customization: [
    { title: 'Currencies and payment methods', where: 'Orders, Payments', what: ['Orders are in their own currency; totals are never mixed across currencies.', 'Methods include UPI, Google Pay, PhonePe, cards, net banking, cash and the international trade methods (wire, letter of credit, documents against payment, escrow, cash against documents).'] },
    { title: 'Partners', where: 'Partners', what: ['Payment terms, credit limit, portal access.'] },
  ],
  faq: [
    { q: 'Why does Billing show Over-recorded?', a: 'More payments were recorded than the order value. Remove the duplicate entries under Payments.' },
    { q: 'Why can I not reassign a task?', a: 'Only the Trade administrator can. Ask them.' },
    { q: 'Why are INR and EUR shown separately?', a: 'They are different currencies and are never added together.' },
  ],
};

const digital: GuideApp = {
  signIn: [
    'Sign in on the common sign-in page. The first screen depends on the role: administrators and account managers see the agency screens, project managers see their own desk, clients see the client portal.',
    'Logins are created by Central under Roles & Users.',
  ],
  menuNotes: {
    Dashboard: 'Agency overview: leads, projects, billing and team load.',
    'AI Assistant': 'Ask questions about projects and clients in plain words.',
    Clients: 'Client accounts and their contacts. Account managers are assigned here.',
    Attendance: 'Clock in/out, leave, verification.',
    Projects: 'Every project with its client, services, deadline, team and status.',
    Deliverables: 'What was promised and delivered for each project.',
    Tasks: 'Tasks with assignee and assigned date; a task marked Done stays Done unless an administrator reopens it.',
    Leads: 'Sales leads before they become clients.',
    Meetings: 'Client and internal meetings.',
    Billing: 'Project billing: custom milestones, partial payments, extra scope and refunds in one system.',
    Invoices: 'Client invoices.',
    Payments: 'Payments received per milestone, with receipts.',
    Expenses: 'Agency expenses; paid payroll appears automatically.',
    Reports: 'Agency reports.',
    Notifications: 'Alerts.',
    Emails: 'Automatic emails.',
    Profile: 'Your details and password.',
    Settings: 'Agency details and invoice look, taxes, services and payment terms, dropdown lists and security.',
    'My Projects': 'The projects assigned to you.',
    Sprints: 'Sprint planning for project managers.',
    Milestones: 'Milestones per project; project managers see payment status but never amounts.',
    Documents: 'Project documents.',
    Support: 'Client support tickets.',
  },
  routines: [
    { who: 'Administrator / account manager', title: 'Lead to paid project', steps: [
      'Leads: record the lead and follow up.', 'Convert to a Client, then create a Project with services and a deadline.',
      'Billing: set the milestones and amounts (custom milestones are allowed).', 'Assign a project manager; they plan sprints and tasks.',
      'Record payments per milestone; receipts are issued. Add extra scope as a new line when the work grows.'] },
    { who: 'Project manager', title: 'Delivering a project', steps: [
      'My Projects: open a project.', 'Plan Sprints and create Tasks with assignees.', 'Mark Milestones complete as work is accepted.',
      'Upload documents and deliverables. You see whether a milestone is paid, never the amount.'] },
    { who: 'Client', title: 'Following your project', steps: [
      'Sign in to the client portal.', 'See your projects, milestones, documents, payments and receipts.'] },
  ],
  customization: [
    { title: 'Agency settings', where: 'Settings (tabs: Agency & invoices, Taxes, Services & payment terms, Lists, Security)', what: ['Your agency name, address and invoice details.', 'Tax names, rates and countries (for example 18% GST for India).', 'The services you sell and the default payment terms.', 'The dropdown lists used across the app, and password security.'] },
    { title: 'Billing', where: 'Billing', what: ['Custom milestones, partial payments, extra scope and refunds.'] },
    { title: 'People and access', where: 'Central → Roles & Users', what: ['Roles decide which screens appear: administrators see billing and settings; project managers and staff do not see amounts.'] },
  ],
  faq: [
    { q: 'A task I finished keeps reopening.', a: 'It no longer does: Done stays Done. An administrator can reopen it.' },
    { q: 'The project manager cannot see amounts.', a: 'By design: they see payment status only.' },
  ],
};

export const GUIDE: Record<AppKey, GuideApp> = { education, rimi, trade, digital };
