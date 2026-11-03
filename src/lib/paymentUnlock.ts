import type { Payment } from './types';
import { getSystemFeeConfig } from './api/feeConfig';
import { educationStageAccess, educationFees, resolveEducationFee, feeBalance, money } from './educationBilling';

export interface StageUnlockStatus {
  isUnlocked: boolean;
  requiredPayment: string;
  paymentStatus: 'paid' | 'pending' | 'not_found';
  message: string;
}

// Compatibility for pages that previously referred to the three tuition installments.
// University tuition is never a Ferex payment prerequisite.
const workflowStage = { 1: 3, 2: 8, 3: 11 };
export function checkPaymentStage(payments: Payment[], stageNum: 1 | 2 | 3, targetCountry?: string): StageUnlockStatus {
  const access = educationStageAccess(getSystemFeeConfig(), payments, workflowStage[stageNum], targetCountry);
  const requiredPayment = access.unpaid.map(f => `${f.title} (${money(feeBalance(f, payments).remaining, f.currency)})`).join(', ');
  return { isUnlocked: access.allowed, requiredPayment: requiredPayment || 'No outstanding Ferex fees for this stage',
    paymentStatus: access.allowed ? 'paid' : access.unpaid.some(f => feeBalance(f, payments).pending > 0) ? 'pending' : 'not_found',
    message: access.allowed ? 'Configured fees for this stage are settled or waived.' : `Outstanding configured fees: ${requiredPayment}` };
}
export function getExpectedPaymentAmount(stageNum: 1 | 2 | 3, targetCountry?: string, _tuitionAmount?: number): number {
  return educationFees(getSystemFeeConfig()).filter(f => f.enabled && f.recipient === 'ferex' && f.currency === 'INR' && f.stage <= workflowStage[stageNum]).reduce((sum, f) => sum + resolveEducationFee(f, targetCountry).amount, 0);
}
export interface JourneyStageAccess {
  canSelectUniversity: boolean; canSubmitApplication: boolean; canViewOfferLetter: boolean;
  canAcceptOffer: boolean; canAccessVisaTracker: boolean; canAccessPreDeparture: boolean; blockedReason?: string;
}
export function getJourneyStageAccess(payments: Payment[], targetCountry?: string): JourneyStageAccess {
  const access = (stage: number) => educationStageAccess(getSystemFeeConfig(), payments, stage, targetCountry);
  const application = access(6), offer = access(8), visa = access(9), departure = access(11);
  return { canSelectUniversity: true, canSubmitApplication: application.allowed, canViewOfferLetter: true,
    canAcceptOffer: offer.allowed, canAccessVisaTracker: visa.allowed, canAccessPreDeparture: departure.allowed,
    blockedReason: [...application.unpaid, ...offer.unpaid, ...visa.unpaid, ...departure.unpaid][0]?.title };
}
export function canAccessPage(pagePath: string, payments: Payment[], targetCountry?: string): { allowed: boolean; reason?: string } {
  const access = getJourneyStageAccess(payments, targetCountry);
  const allowed = pagePath.includes('/applications/new') ? access.canSubmitApplication : pagePath.includes('/offer') && pagePath.includes('/accept') ? access.canAcceptOffer : pagePath.includes('/pre-departure') ? access.canAccessPreDeparture : true;
  return { allowed, reason: allowed ? undefined : `Complete the configured fees in Payments & billing: ${access.blockedReason || ''}` };
}
export function getNextRequiredPayment(payments: Payment[], targetCountry?: string) {
  const next = educationFees(getSystemFeeConfig()).filter(f => f.enabled && f.recipient === 'ferex').map(f => resolveEducationFee(f, targetCountry)).sort((a,b) => a.stage - b.stage).find(f => feeBalance(f, payments).remaining > 0);
  return next ? { stageNum: (next.stage <= 3 ? 1 : next.stage <= 8 ? 2 : 3) as 1 | 2 | 3, name: next.title, description: next.description, status: 'required' as const, expectedAmount: feeBalance(next, payments).remaining } : { stageNum: null, name: 'Configured fees settled', description: 'No outstanding Ferex fees.', status: 'all_complete' as const, expectedAmount: 0 };
}
