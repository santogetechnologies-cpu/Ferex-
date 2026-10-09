import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { month, adminId, adminName } = await req.json();

    if (!month) {
      return new Response(JSON.stringify({ error: 'Missing payroll month (YYYY-MM)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch all employee salaries
    const { data: salaries, error: salaryError } = await supabaseClient
      .from('employee_salaries')
      .select('*');

    if (salaryError) throw salaryError;

    // 2. Fetch all verified/locked timesheets for that month
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const { data: timesheets, error: timesheetError } = await supabaseClient
      .from('attendance_timesheets')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .or('is_admin_verified.eq.true,is_superadmin_locked.eq.true');

    if (timesheetError) throw timesheetError;

    const totalWorkingDays = 22;
    const payrollRecords = [];

    for (const salary of salaries || []) {
      const userSheets = (timesheets || []).filter(
        (t) => t.user_email === salary.user_email
      );

      const attendedDays = userSheets.length;
      const verifiedHours = userSheets.reduce(
        (sum, t) => sum + (Number(t.total_hours) || 0),
        0
      );

      let calculatedGross = Number(salary.monthly_base_salary) || 0;
      if (attendedDays < totalWorkingDays && attendedDays > 0) {
        calculatedGross = Number(
          ((salary.monthly_base_salary / totalWorkingDays) * attendedDays).toFixed(2)
        );
      } else if (attendedDays === 0) {
        calculatedGross = Number(
          (verifiedHours * (Number(salary.hourly_rate) || 0)).toFixed(2)
        );
      }

      const allowances = 150.0;
      const deductions = 0.0;
      const netPayable = Math.max(0, calculatedGross + allowances - deductions);

      payrollRecords.push({
        payroll_month: month,
        user_id: salary.user_id,
        user_email: salary.user_email,
        user_name: salary.user_name,
        division: salary.division,
        user_role: salary.user_role,
        total_working_days: totalWorkingDays,
        attended_days: attendedDays,
        verified_hours: Number(verifiedHours.toFixed(1)),
        base_salary: salary.monthly_base_salary,
        hourly_rate: salary.hourly_rate,
        calculated_gross_pay: calculatedGross,
        allowances,
        deductions,
        net_payable: netPayable,
        status: 'approved',
        processed_by_id: adminId || null,
        processed_by_name: adminName || 'Central Super Admin',
        processed_at: new Date().toISOString(),
      });
    }

    if (payrollRecords.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from('monthly_payrolls')
        .upsert(payrollRecords, { onConflict: 'payroll_month,user_email' });

      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payroll processed for ${payrollRecords.length} employees`,
        records: payrollRecords,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
