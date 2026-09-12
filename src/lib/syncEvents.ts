/**
 * Cross-Role Synchronization Event System
 * 
 * Ensures consistent data updates across Student, Admin, and Counselor roles
 * by dispatching and listening to standardized events.
 */

// ═══════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const SYNC_EVENTS = {
  // Payment Events
  PAYMENT_SUBMITTED: 'ferex_payment_submitted',
  PAYMENT_VERIFIED: 'ferex_payment_verified',
  PAYMENT_REJECTED: 'ferex_payment_rejected',
  PAYMENT_CHANGE: 'ferex_payment_change',
  
  // Document Events
  DOCUMENT_UPLOADED: 'ferex_document_uploaded',
  DOCUMENT_APPROVED: 'ferex_document_approved',
  DOCUMENT_REJECTED: 'ferex_document_rejected',
  DOCUMENT_CHANGE: 'ferex_document_change',
  
  // Application Events
  APPLICATION_SUBMITTED: 'ferex_application_submitted',
  APPLICATION_STATUS_CHANGE: 'ferex_application_status_change',
  APPLICATION_CHANGE: 'ferex_application_change',
  APPLICATIONS_CHANGE: 'ferex_applications_change',
  
  // NAWA/Legalization Events
  NAWA_CREATED: 'ferex_nawa_created',
  NAWA_STATUS_CHANGE: 'ferex_nawa_status_change',
  NAWA_CHANGE: 'ferex_nawa_change',
  
  // Journey/Stage Events
  JOURNEY_UNLOCK: 'ferex_journey_unlock',
  JOURNEY_STAGE_COMPLETE: 'ferex_journey_stage_complete',
  JOURNEY_CHANGE: 'ferex_journey_change',
  
  // Offer Letter Events
  OFFER_ISSUED: 'ferex_offer_issued',
  OFFER_ACCEPTED: 'ferex_offer_accepted',
  FINAL_ACCEPTANCE_ISSUED: 'ferex_final_acceptance_issued',
  
  // Visa Events
  VISA_STATUS_CHANGE: 'ferex_visa_status_change',
  VISA_APPROVED: 'ferex_visa_approved',
  VISA_REJECTED: 'ferex_visa_rejected',
  
  // Notification Events
  NOTIFICATION_CHANGE: 'ferex_notification_change',
  NOTIFICATION_READ: 'ferex_notification_read',
  
  // Staff/Counselor Events
  COUNSELOR_ASSIGNED: 'ferex_counselor_assigned',
  TASK_ASSIGNED: 'ferex_task_assigned',
  TASK_COMPLETED: 'ferex_task_completed',
  
  // Meeting Events
  MEETING_SCHEDULED: 'ferex_meeting_scheduled',
  MEETING_COMPLETED: 'ferex_meeting_completed',
  MEETING_CANCELLED: 'ferex_meeting_cancelled',
  
  // Student Events
  STUDENT_REGISTERED: 'ferex_student_registered',
  STUDENT_PROFILE_UPDATED: 'ferex_student_profile_updated',
  
  // Auth Events
  AUTH_CHANGE: 'ferex_auth_change',
  AVATAR_CHANGE: 'ferex_avatar_change',
} as const;

export type SyncEventType = typeof SYNC_EVENTS[keyof typeof SYNC_EVENTS];

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncEventDetail {
  [key: string]: any;
}

/**
 * Dispatch a synchronization event with optional detail data
 */
export function dispatchSyncEvent(eventType: SyncEventType, detail?: SyncEventDetail): void {
  if (detail) {
    window.dispatchEvent(new CustomEvent(eventType, { detail }));
  } else {
    window.dispatchEvent(new Event(eventType));
  }
  
  console.log(`[SYNC] Dispatched: ${eventType}`, detail || '');
}

/**
 * Dispatch multiple related events (for cascading updates)
 */
export function dispatchSyncEvents(events: Array<{ type: SyncEventType; detail?: SyncEventDetail }>): void {
  events.forEach(({ type, detail }) => {
    dispatchSyncEvent(type, detail);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

export type SyncEventListener = (detail?: SyncEventDetail) => void;

/**
 * Subscribe to a synchronization event
 */
export function subscribeSyncEvent(
  eventType: SyncEventType,
  listener: SyncEventListener
): () => void {
  const wrappedListener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    listener(detail);
  };

  window.addEventListener(eventType, wrappedListener);

  // Return unsubscribe function
  return () => {
    window.removeEventListener(eventType, wrappedListener);
  };
}

/**
 * Subscribe to multiple events with the same listener
 */
export function subscribeMultipleSyncEvents(
  eventTypes: SyncEventType[],
  listener: SyncEventListener
): () => void {
  const unsubscribers = eventTypes.map(type => subscribeSyncEvent(type, listener));

  // Return combined unsubscribe function
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON EVENT WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Payment Verification Workflow
 * Triggers all necessary events when a payment is verified
 */
export function triggerPaymentVerificationWorkflow(paymentDetail: {
  paymentId: string;
  studentId: string;
  amount: number;
  paymentType?: string;
  stageNumber?: number;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.PAYMENT_VERIFIED, detail: paymentDetail },
    { type: SYNC_EVENTS.PAYMENT_CHANGE, detail: paymentDetail },
    { type: SYNC_EVENTS.JOURNEY_UNLOCK, detail: { studentId: paymentDetail.studentId } },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: paymentDetail.studentId } },
  ]);
}

/**
 * Document Approval Workflow
 * Triggers NAWA creation and application updates
 */
export function triggerDocumentApprovalWorkflow(documentDetail: {
  documentId: string;
  studentId: string;
  studentName: string;
  documentType: string;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.DOCUMENT_APPROVED, detail: documentDetail },
    { type: SYNC_EVENTS.DOCUMENT_CHANGE, detail: documentDetail },
    { type: SYNC_EVENTS.NAWA_CREATED, detail: documentDetail },
    { type: SYNC_EVENTS.APPLICATION_CHANGE, detail: { studentId: documentDetail.studentId } },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: documentDetail.studentId } },
  ]);
}

/**
 * Application Status Change Workflow
 * Syncs with NAWA and updates journey
 */
export function triggerApplicationStatusWorkflow(applicationDetail: {
  applicationId: string;
  studentId: string;
  oldStatus: string;
  newStatus: string;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.APPLICATION_STATUS_CHANGE, detail: applicationDetail },
    { type: SYNC_EVENTS.APPLICATION_CHANGE, detail: applicationDetail },
    { type: SYNC_EVENTS.APPLICATIONS_CHANGE, detail: applicationDetail },
    { type: SYNC_EVENTS.NAWA_STATUS_CHANGE, detail: applicationDetail },
    { type: SYNC_EVENTS.JOURNEY_CHANGE, detail: { studentId: applicationDetail.studentId } },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: applicationDetail.studentId } },
  ]);
}

/**
 * Offer Letter Acceptance Workflow
 * Unlocks next stages and updates application
 */
export function triggerOfferAcceptanceWorkflow(offerDetail: {
  applicationId: string;
  studentId: string;
  studentName: string;
  universityName: string;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.OFFER_ACCEPTED, detail: offerDetail },
    { type: SYNC_EVENTS.APPLICATION_STATUS_CHANGE, detail: { ...offerDetail, newStatus: 'Accepted' } },
    { type: SYNC_EVENTS.APPLICATION_CHANGE, detail: offerDetail },
    { type: SYNC_EVENTS.JOURNEY_UNLOCK, detail: { studentId: offerDetail.studentId } },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: offerDetail.studentId } },
  ]);
}

/**
 * NAWA Status Update Workflow
 * Syncs with application status
 */
export function triggerNawaUpdateWorkflow(nawaDetail: {
  nawaId: string;
  studentId: string;
  currentStep: number;
  status: string;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.NAWA_STATUS_CHANGE, detail: nawaDetail },
    { type: SYNC_EVENTS.NAWA_CHANGE, detail: nawaDetail },
    { type: SYNC_EVENTS.APPLICATION_STATUS_CHANGE, detail: nawaDetail },
    { type: SYNC_EVENTS.APPLICATION_CHANGE, detail: { studentId: nawaDetail.studentId } },
    { type: SYNC_EVENTS.JOURNEY_CHANGE, detail: { studentId: nawaDetail.studentId } },
  ]);
}

/**
 * Counselor Assignment Workflow
 */
export function triggerCounselorAssignmentWorkflow(assignmentDetail: {
  studentId: string;
  studentName: string;
  counselorName: string;
  counselorEmail?: string;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.COUNSELOR_ASSIGNED, detail: assignmentDetail },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: assignmentDetail.studentId } },
  ]);
}

/**
 * Meeting Scheduled Workflow
 */
export function triggerMeetingScheduledWorkflow(meetingDetail: {
  meetingId: string;
  studentId: string;
  staffId: string;
  scheduledDate: string;
  subject: string;
}): void {
  dispatchSyncEvents([
    { type: SYNC_EVENTS.MEETING_SCHEDULED, detail: meetingDetail },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: meetingDetail.studentId } },
    { type: SYNC_EVENTS.NOTIFICATION_CHANGE, detail: { studentId: meetingDetail.staffId } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// REACT HOOK FOR EVENT LISTENING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * React Hook to subscribe to sync events
 * Usage: useSyncEvent(SYNC_EVENTS.PAYMENT_CHANGE, () => refetchPayments());
 */
export function useSyncEvent(
  eventType: SyncEventType | SyncEventType[],
  listener: SyncEventListener
): void {
  if (typeof window === 'undefined') return;

  const eventTypes = Array.isArray(eventType) ? eventType : [eventType];

  React.useEffect(() => {
    const unsubscribe = subscribeMultipleSyncEvents(eventTypes, listener);
    return unsubscribe;
  }, [eventTypes, listener]);
}

// Import React for hook (conditional)
const React = typeof window !== 'undefined' && (window as any).React;
