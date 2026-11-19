import { supabase } from '../supabase';

export type ExpenseDivision = 'education' | 'rimi' | 'trade';
export interface DivisionExpense {
  id: string; division: ExpenseDivision; expense_date: string; category: string; vendor: string; description: string;
  amount: number; currency: string; payment_method: string; reference_no: string; status: 'Paid' | 'Pending' | 'Cancelled';
  created_by_name: string; created_at: string;
}

export const EXPENSE_CATEGORIES: Record<ExpenseDivision, string[]> = {
  education: ['Marketing & Ads', 'Salaries & Commissions', 'Office & Rent', 'Software & Subscriptions', 'Travel', 'Agent Payouts', 'Courier & Documents', 'Legal & Compliance', 'Other'],
  rimi: ['Fuel & Reefer Running', 'Truck Maintenance', 'Cold Storage & Electricity', 'Packaging', 'Driver & Warehouse Wages', 'Insurance', 'Tolls & Permits', 'Other'],
  trade: ['Salaries & Wages', 'Freight & Shipping', 'Customs & Duties', 'Port & Handling', 'Inspection & Certificates', 'Insurance', 'Bank & LC Charges', 'Storage', 'Other'],
};
export const EXPENSE_METHODS = ['Bank Transfer', 'UPI', 'Cash', 'Card', 'Cheque'];

const num = (v: unknown) => Number(v) || 0;
const map = (r: any): DivisionExpense => ({ ...r, amount: num(r.amount) });

export async function getDivisionExpenses(division: ExpenseDivision): Promise<DivisionExpense[]> {
  const { data, error } = await supabase.from('division_expenses').select('*').eq('division', division).order('expense_date', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load expenses: ${error.message}`);
  return (data || []).map(map);
}

export async function saveDivisionExpense(division: ExpenseDivision, e: Partial<DivisionExpense> & { category: string; amount: number }, by = ''): Promise<DivisionExpense> {
  if (!e.category?.trim()) throw new Error('Choose a category');
  if (!(Number(e.amount) > 0)) throw new Error('Enter an amount greater than zero');
  if (!e.expense_date) throw new Error('Choose the date');
  if (e.expense_date > new Date().toISOString().slice(0, 10)) throw new Error('The expense date cannot be in the future');
  const row = {
    division, expense_date: e.expense_date, category: e.category.trim(), vendor: (e.vendor || '').trim(), description: (e.description || '').trim(),
    amount: Number(e.amount), currency: e.currency || 'INR', payment_method: e.payment_method || 'Bank Transfer', reference_no: (e.reference_no || '').trim(), status: e.status || 'Paid',
    updated_at: new Date().toISOString(),
  };
  const q = e.id ? supabase.from('division_expenses').update(row).eq('id', e.id) : supabase.from('division_expenses').insert({ ...row, created_by_name: by });
  const { data, error } = await q.select().single();
  if (error) throw new Error(`Could not save the expense: ${error.message}`);
  return map(data);
}

export async function deleteDivisionExpense(id: string): Promise<void> {
  const { data, error } = await supabase.from('division_expenses').delete().eq('id', id).select('id');
  if (error) throw new Error(`Could not delete the expense: ${error.message}`);
  if (!data?.length) throw new Error('This expense no longer exists, or you do not have permission to delete it.');
}
