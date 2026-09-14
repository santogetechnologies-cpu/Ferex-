import { supabase } from '../supabase';
import type { University, CourseProgram, PaymentInstallment } from '../types';
import { generateUUID } from '../../utils/uuid';

/**
 * Syncs university course programs and installments to student payments
 * Creates pending payment records for selected courses
 */
export async function syncUniversityFeesToStudent(
  studentId: string,
  studentName: string,
  universityId: string,
  selectedCourseProgram: CourseProgram
): Promise<void> {
  console.log('[syncUniversityFees] Starting sync for student:', studentName);

  try {
    // Fetch university with all fee details
    const { data: university, error: uniError } = await supabase
      .from('universities')
      .select('*')
      .eq('id', universityId)
      .single();

    if (uniError || !university) {
      console.error('[syncUniversityFees] University not found:', uniError);
      return;
    }

    const uni = university as unknown as University;
    console.log('[syncUniversityFees] University:', uni.name);
    console.log('[syncUniversityFees] Course programs:', uni.course_programs?.length || 0);
    console.log('[syncUniversityFees] Installments:', uni.installments?.length || 0);

    // Check if payments already exist for this student
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId);

    const hasCoursePayment = existingPayments?.some(p => 
      p.payment_type === 'Course Tuition' || 
      (p.title && p.title.toLowerCase().includes('tuition'))
    );

    // 1. Create payment for selected course tuition if not exists
    if (!hasCoursePayment && selectedCourseProgram.tuition_fee) {
      const tuitionAmount = parseFeeToINR(selectedCourseProgram.tuition_fee);
      
      await supabase.from('payments').insert({
        id: generateUUID(),
        student_id: studentId,
        student_name: studentName,
        title: `${selectedCourseProgram.name} - Tuition Fee`,
        description: `Annual tuition fee for ${selectedCourseProgram.degree_level} program`,
        amount: tuitionAmount,
        payment_type: 'Course Tuition',
        payment_method: 'Pending',
        status: 'Pending',
        stage_number: 2,
        created_at: new Date().toISOString(),
      });

      console.log('[syncUniversityFees] ✅ Created course tuition payment:', tuitionAmount);
    }

    // 2. Create payments from university installments if defined
    if (uni.installments && uni.installments.length > 0) {
      for (const installment of uni.installments) {
        const exists = existingPayments?.some(p => 
          p.title === installment.title ||
          (p.description && p.description.includes(installment.title))
        );

        if (!exists) {
          const amount = parseFeeToINR(String(installment.amount || '0'));
          const stageNum = extractStageNumber(String(installment.due_stage || installment.stage || ''));

          await supabase.from('payments').insert({
            id: generateUUID(),
            student_id: studentId,
            student_name: studentName,
            title: installment.title,
            description: `Due at: ${installment.due_stage}`,
            amount: amount,
            payment_type: 'University Fee',
            payment_method: 'Pending',
            status: 'Pending',
            stage_number: stageNum,
            created_at: new Date().toISOString(),
          });

          console.log('[syncUniversityFees] ✅ Created installment payment:', installment.title, amount);
        }
      }
    }

    // 3. Create payments for VFS and Agency fees if defined
    if (uni.vfs_fee) {
      const hasVfs = existingPayments?.some(p => 
        p.payment_type === 'VFS Fee' || 
        (p.title && p.title.toLowerCase().includes('vfs'))
      );

      if (!hasVfs) {
        const vfsAmount = parseFeeToINR(uni.vfs_fee);
        
        await supabase.from('payments').insert({
          id: generateUUID(),
          student_id: studentId,
          student_name: studentName,
          title: 'VFS Visa Application Fee',
          description: 'Visa application center processing fee',
          amount: vfsAmount,
          payment_type: 'VFS Fee',
          payment_method: 'Pending',
          status: 'Pending',
          stage_number: 3,
          created_at: new Date().toISOString(),
        });

        console.log('[syncUniversityFees] ✅ Created VFS fee payment:', vfsAmount);
      }
    }

    if (uni.agency_fee) {
      const hasAgency = existingPayments?.some(p => 
        p.payment_type === 'Agency Fee' || 
        (p.title && p.title.toLowerCase().includes('agency'))
      );

      if (!hasAgency) {
        const agencyAmount = parseFeeToINR(uni.agency_fee);
        
        await supabase.from('payments').insert({
          id: generateUUID(),
          student_id: studentId,
          student_name: studentName,
          title: 'Agency Advisory & Support Fee',
          description: 'Complete application support and counseling',
          amount: agencyAmount,
          payment_type: 'Agency Fee',
          payment_method: 'Pending',
          status: 'Pending',
          stage_number: 3,
          created_at: new Date().toISOString(),
        });

        console.log('[syncUniversityFees] ✅ Created agency fee payment:', agencyAmount);
      }
    }

    // Dispatch event to refresh payment components
    window.dispatchEvent(new Event('ferex_payment_change'));
    console.log('[syncUniversityFees] ✅ Sync complete');

  } catch (error) {
    console.error('[syncUniversityFees] Error:', error);
    throw error;
  }
}

/**
 * Parse fee string to INR number
 */
function parseFeeToINR(feeStr: string): number {
  const str = String(feeStr).trim().toLowerCase();

  // Handle Euro (€) format
  if (str.includes('€') || str.includes('eur') || str.includes('euro')) {
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 90); // Convert EUR to INR
    }
  }

  // Handle Rupee (₹) format
  if (str.includes('₹') || str.includes('inr') || str.includes('rs')) {
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return Math.round(num);
    }
  }

  // Handle lakhs
  if (str.includes('lakh') || str.includes('lac')) {
    const match = str.match(/([0-9.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        return num < 100 ? Math.round(num * 100000) : Math.round(num);
      }
    }
  }

  // Default parsing
  const cleaned = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) {
    // If less than 20000, assume it's EUR and convert
    if (num < 20000) {
      return Math.round(num * 90);
    }
    return Math.round(num);
  }

  return 0;
}

/**
 * Extract stage number from due_stage string
 */
function extractStageNumber(dueStage: string): number {
  const lower = dueStage.toLowerCase();
  
  if (lower.includes('1st') || lower.includes('first') || lower.includes('registration')) {
    return 1;
  }
  if (lower.includes('2nd') || lower.includes('second') || lower.includes('tuition')) {
    return 2;
  }
  if (lower.includes('3rd') || lower.includes('third') || lower.includes('final') || lower.includes('vfs') || lower.includes('agency')) {
    return 3;
  }
  
  // Try to extract number
  const match = dueStage.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 3) {
      return num;
    }
  }
  
  return 2; // Default to stage 2
}
