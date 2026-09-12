/**
 * Payment-Based Journey Stage Unlocking System
 * 
 * This module ensures proper payment verification before allowing
 * students to progress through their journey stages.
 */

import type { Payment } from './types';

export interface StageUnlockStatus {
  isUnlocked: boolean;
  requiredPayment: string;
  paymentStatus: 'paid' | 'pending' | 'not_found';
  message: string;
}

/**
 * Check if a specific installment stage has been paid
 */
export function checkPaymentStage(payments: Payment[], stageNum: 1 | 2 | 3): StageUnlockStatus {
  if (!payments || payments.length === 0) {
    return {
      isUnlocked: false,
      requiredPayment: getPaymentName(stageNum),
      paymentStatus: 'not_found',
      message: `${getPaymentName(stageNum)} payment is required to unlock this stage.`
    };
  }

  // Find payment for this specific stage
  const stagePayment = payments.find(p => {
    // Check stage_number property
    if ((p as any).stage_number !== undefined && (p as any).stage_number !== null) {
      return Number((p as any).stage_number) === stageNum;
    }
    if ((p as any).installment_stage !== undefined && (p as any).installment_stage !== null) {
      return Number((p as any).installment_stage) === stageNum;
    }

    // Fallback: Check payment text content
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    
    if (stageNum === 1) {
      return text.includes('1st') || text.includes('stage 1') || text.includes('registration fee') || 
             text.includes('advance') || text.includes('audit deposit');
    }
    if (stageNum === 2) {
      return text.includes('2nd') || text.includes('stage 2') || text.includes('tuition fee');
    }
    if (stageNum === 3) {
      return text.includes('3rd') || text.includes('stage 3') || text.includes('vfs') || 
             text.includes('visa clearance') || text.includes('agency');
    }
    return false;
  });

  if (!stagePayment) {
    return {
      isUnlocked: false,
      requiredPayment: getPaymentName(stageNum),
      paymentStatus: 'not_found',
      message: `${getPaymentName(stageNum)} payment has not been submitted yet.`
    };
  }

  const isPaid = stagePayment.status === 'Paid' || stagePayment.status === 'Verified';
  
  return {
    isUnlocked: isPaid,
    requiredPayment: getPaymentName(stageNum),
    paymentStatus: isPaid ? 'paid' : 'pending',
    message: isPaid 
      ? `${getPaymentName(stageNum)} has been verified. This stage is unlocked.`
      : `${getPaymentName(stageNum)} is awaiting admin verification. Please wait for approval.`
  };
}

/**
 * Get payment name for stage number
 */
function getPaymentName(stageNum: 1 | 2 | 3): string {
  switch (stageNum) {
    case 1: return '1st Installment (Registration & Legalization Fee)';
    case 2: return '2nd Installment (University Tuition Fee)';
    case 3: return '3rd Installment (Agency & VFS Visa Fee)';
  }
}

/**
 * Determine which journey stages should be unlocked based on payment status
 */
export interface JourneyStageAccess {
  canSelectUniversity: boolean;
  canSubmitApplication: boolean;
  canViewOfferLetter: boolean;
  canAcceptOffer: boolean;
  canAccessVisaTracker: boolean;
  canAccessPreDeparture: boolean;
  blockedReason?: string;
}

export function getJourneyStageAccess(payments: Payment[]): JourneyStageAccess {
  const payment1 = checkPaymentStage(payments, 1);
  const payment2 = checkPaymentStage(payments, 2);
  const payment3 = checkPaymentStage(payments, 3);

  return {
    // Stage unlocked after 1st installment is paid
    canSelectUniversity: payment1.isUnlocked,
    canSubmitApplication: payment1.isUnlocked,
    
    // Offer letter viewing is allowed once application is submitted (no payment lock)
    // But acceptance requires 2nd installment to be paid
    canViewOfferLetter: true,
    canAcceptOffer: payment2.isUnlocked,
    
    // Visa tracker access after 2nd installment
    canAccessVisaTracker: payment2.isUnlocked,
    
    // Pre-departure after 3rd installment
    canAccessPreDeparture: payment3.isUnlocked,
    
    blockedReason: !payment1.isUnlocked 
      ? '1st Installment payment verification required'
      : !payment2.isUnlocked
      ? '2nd Installment payment verification required'
      : !payment3.isUnlocked
      ? '3rd Installment payment verification required'
      : undefined
  };
}

/**
 * Check if student can access a specific page based on payment status
 */
export function canAccessPage(pagePath: string, payments: Payment[]): { allowed: boolean; reason?: string } {
  const access = getJourneyStageAccess(payments);
  
  // Routes that require 1st installment
  if (pagePath.includes('/select-university') || pagePath.includes('/universities')) {
    return {
      allowed: access.canSelectUniversity,
      reason: access.canSelectUniversity ? undefined : 'Please complete 1st Installment payment to select universities.'
    };
  }
  
  if (pagePath.includes('/applications') && pagePath.includes('/new')) {
    return {
      allowed: access.canSubmitApplication,
      reason: access.canSubmitApplication ? undefined : 'Please complete 1st Installment payment to submit applications.'
    };
  }
  
  // Routes that require 2nd installment
  if (pagePath.includes('/offer') && pagePath.includes('/accept')) {
    return {
      allowed: access.canAcceptOffer,
      reason: access.canAcceptOffer ? undefined : 'Please complete 2nd Installment (University Tuition) payment to accept offer letter.'
    };
  }
  
  if (pagePath.includes('/visa-tracker')) {
    return {
      allowed: access.canAccessVisaTracker,
      reason: access.canAccessVisaTracker ? undefined : 'Visa tracker will be unlocked after 2nd Installment payment.'
    };
  }
  
  // Routes that require 3rd installment
  if (pagePath.includes('/pre-departure')) {
    return {
      allowed: access.canAccessPreDeparture,
      reason: access.canAccessPreDeparture ? undefined : 'Pre-departure checklist will be unlocked after 3rd Installment payment.'
    };
  }
  
  // Default: allow access
  return { allowed: true };
}

/**
 * Get next required payment based on current payment status
 */
export function getNextRequiredPayment(payments: Payment[]): {
  stageNum: 1 | 2 | 3 | null;
  name: string;
  description: string;
  status: 'required' | 'all_complete';
} {
  const payment1 = checkPaymentStage(payments, 1);
  const payment2 = checkPaymentStage(payments, 2);
  const payment3 = checkPaymentStage(payments, 3);

  if (!payment1.isUnlocked) {
    return {
      stageNum: 1,
      name: '1st Installment - Registration & Legalization Fee',
      description: 'Required to unlock university selection and application submission.',
      status: 'required'
    };
  }

  if (!payment2.isUnlocked) {
    return {
      stageNum: 2,
      name: '2nd Installment - University Tuition Fee',
      description: 'Required to accept offer letter and access visa tracking.',
      status: 'required'
    };
  }

  if (!payment3.isUnlocked) {
    return {
      stageNum: 3,
      name: '3rd Installment - Agency & VFS Visa Fee',
      description: 'Required to access pre-departure checklist and travel planning.',
      status: 'required'
    };
  }

  return {
    stageNum: null,
    name: 'All Payments Complete',
    description: 'All required payments have been verified. Full journey access granted.',
    status: 'all_complete'
  };
}
