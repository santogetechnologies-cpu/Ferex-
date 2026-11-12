import type { EducationLead } from './api/educationLeads';

export interface ClosureRow {
  leadId: string;
  studentName: string;
  phone: string;
  country: string;
  counselor: string;
  closedAt: string;
  studentId?: string;
}

export interface CounselorClosures {
  counselor: string;
  count: number;
  students: ClosureRow[];
}

/** The moment a lead was closed (enrolled). Older rows without converted_at fall back to their last update. */
export function closedAt(lead: EducationLead): string | null {
  if (lead.status !== 'Enrolled') return null;
  return lead.converted_at || lead.updated_at || lead.created_at || null;
}

/** Local calendar month ("YYYY-MM") of an ISO timestamp. */
export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Closed leads whose closing date falls in `month` ("YYYY-MM"), grouped by the counselor who owns the lead. */
export function closuresForMonth(leads: EducationLead[], month: string): { total: number; byCounselor: CounselorClosures[] } {
  const groups = new Map<string, CounselorClosures>();
  let total = 0;
  for (const lead of leads) {
    const at = closedAt(lead);
    if (!at || Number.isNaN(Date.parse(at)) || monthKey(at) !== month) continue;
    const counselor = (lead.assigned_counselor_name || lead.converted_by || '').trim() || 'Unassigned';
    const group = groups.get(counselor) || { counselor, count: 0, students: [] };
    group.students.push({
      leadId: lead.id, studentName: lead.name || lead.phone, phone: lead.phone,
      country: lead.preferred_country || '—', counselor, closedAt: at, studentId: lead.converted_student_id,
    });
    group.count += 1;
    groups.set(counselor, group);
    total += 1;
  }
  const byCounselor = Array.from(groups.values()).sort((a, b) => b.count - a.count || a.counselor.localeCompare(b.counselor));
  byCounselor.forEach(g => g.students.sort((a, b) => b.closedAt.localeCompare(a.closedAt)));
  return { total, byCounselor };
}
