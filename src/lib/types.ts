// ─── Shared types used across the Education portal ───────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string;
  phone: string;
  created_at: string;
  must_change_password?: boolean;
  department?: string;
  permissions?: { label: string; enabled: boolean }[];
}

export interface PaymentInstallment {
  id: string;
  title: string;
  amount: string;
  due_stage: string;
}

export interface CourseSemester {
  semester_number: number;
  title: string;
  subjects: string[];
  credits?: string;
}

export interface CourseProgram {
  id: string;
  name: string;
  degree_level: string;
  tuition_fee: string;
  duration?: string;
}

export interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  logo_url: string;
  ranking: number;
  rating?: number;
  programs: string[];
  tuition_range: string;
  is_active: boolean;
  intakes?: string[];
  university_fee?: string;
  vfs_fee?: string;
  agency_fee?: string;
  course_programs?: CourseProgram[];
  installments?: PaymentInstallment[];
  semesters?: CourseSemester[];
}

export interface Application {
  id: string;
  student_id: string;
  university_id: string;
  course: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Offer Issued' | 'Accepted' | 'Final Acceptance Issued' | 'Rejected' | 'Withdrawn';
  applied_date: string;
  notes: string;
  offer_letter_url?: string;
  final_acceptance_url?: string;
  tuition_fee?: string | number;
  course_fee?: string | number;
  created_at: string;
  updated_at: string;
  student_name?: string;
  university_name?: string;
  program_name?: string;
  intake?: string;
  // joined
  universities?: University;
  users?: UserProfile;
}

export interface ChecklistItem {
  id: string;
  application_id: string;
  item_name: string;
  is_done: boolean;
  completed_at: string | null;
  sort_order: number;
}

export interface JourneyStage {
  id: string;
  student_id: string;
  stage_number: number;
  stage_name: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  completed_at: string | null;
  notes: string;
}

export interface StudentDocument {
  id: string;
  student_id: string;
  file_name: string;
  file_url: string;
  file_size: string;
  doc_type: 'Identification' | 'Language Test' | 'Transcripts' | 'Recommendation' | 'Medical Check' | 'Other';
  status: 'Pending Verification' | 'Approved' | 'Rejected' | 'Re-upload Requested';
  reviewer_id: string | null;
  reviewer_notes: string;
  uploaded_at: string;
  reviewed_at: string | null;
  // joined
  users?: UserProfile;
}

export interface Payment {
  id: string;
  student_id: string;
  student_name?: string;
  ref_no: string;
  title?: string;
  description: string;
  amount: number;
  currency: string;
  payment_type?: string;
  status: 'Pending' | 'Pending Verification' | 'Paid' | 'Verified' | 'Rejected' | 'Overdue' | 'Cancelled';
  due_date: string | null;
  paid_at: string | null;
  payment_method: string;
  utr_number?: string;
  receipt_url?: string;
  reviewer_notes?: string;
  created_at: string;
  // joined
  users?: UserProfile;
}

export interface Invoice {
  id: string;
  student_id: string;
  payment_id: string | null;
  invoice_no: string;
  description: string;
  amount: number;
  currency: string;
  status: 'Unpaid' | 'Paid' | 'Overdue';
  due_date: string | null;
  issued_at: string;
}

export interface Receipt {
  id: string;
  student_id: string;
  payment_id: string | null;
  receipt_no: string;
  description: string;
  amount: number;
  currency: string;
  issued_at: string;
}

export interface Meeting {
  id: string;
  student_id: string | null;
  advisor_id: string | null;
  subject: string;
  advisor_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  meeting_link: string;
  notes: string;
  created_at: string;
  // joined
  users?: UserProfile;
}

export interface Conversation {
  id: string;
  name: string;
  participant_ids: string[];
  is_group: boolean;
  last_message: string;
  last_message_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_attachment: boolean;
  attachment_url: string;
  sent_at: string;
  // joined
  users?: UserProfile;
}

export interface SupportTicket {
  id: string;
  student_id: string;
  assigned_to: string | null;
  ticket_no: string;
  subject: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created_at: string;
  updated_at: string;
  // joined
  users?: UserProfile;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  is_staff: boolean;
  sent_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

export interface Task {
  id: string;
  created_by: string;
  assigned_to: string | null;
  student_id: string | null;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'To Do' | 'In Progress' | 'Completed' | 'Cancelled';
  due_date: string | null;
  completed_at: string | null;
  portal: string;
  created_at: string;
  updated_at: string;
  // joined
  assignee?: UserProfile;
  student?: UserProfile;
}
