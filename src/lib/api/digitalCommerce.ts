import { supabase } from '../supabase';
import { defaultCommerceSettings, validateCommerce, type CommerceBody, type CommerceContract, type CommerceSettings } from '../digitalCommerce';
export async function commerceList(table: string) {
  const { data,error } = await supabase.from(table).select('*').order('created_at',{ascending:false});
  if (error) throw new Error(error.message); return data || [];
}
export async function getCommerceSettings(): Promise<CommerceSettings> {
  const { data,error } = await supabase.from('digital_commerce_settings').select('config').eq('id',true).single();
  if (error) throw new Error(error.message);
  return { ...defaultCommerceSettings, ...data.config };
}
export async function saveCommerceSettings(config: CommerceSettings) {
  if (!config.agency_name.trim()) throw new Error('Agency name is required');
  for (const tax of config.taxes) if (!tax.label.trim() || !Number.isFinite(tax.rate) || tax.rate<0 || tax.rate>100 || (tax.country!=='*' && !/^[A-Z]{2}$/.test(tax.country))) throw new Error('Invalid tax rule');
  for (const term of config.terms) if (!term.parts.length || term.parts.some(p=>!p.label.trim() || p.percentage<=0 || !Number.isFinite(p.percentage) || !Number.isFinite(p.days) || p.days<0) || Math.abs(term.parts.reduce((s,p)=>s+p.percentage,0)-100)>0.000001) throw new Error('Template percentages must total 100 with valid due-day offsets');
  const { error } = await supabase.from('digital_commerce_settings').update({config,updated_at:new Date().toISOString()}).eq('id',true);
  if (error) throw new Error(error.message);
}
export async function saveContract(body: CommerceBody, existing?: CommerceContract) {
  validateCommerce(body);
  const { data,error } = await supabase.rpc('digital_save_contract',{p_id:existing?.id || null,p_revision:existing?.revision || 0,p_body:body});
  if (error) throw new Error(error.message); return data as CommerceContract;
}
export async function amendContract(existing: CommerceContract,body: CommerceBody) {
  validateCommerce(body);
  const {data,error}=await supabase.rpc('digital_amend_contract',{p_contract:existing.id,p_revision:existing.revision,p_lines:body.lines,p_parts:body.parts,p_reason:body.notes});
  if(error)throw new Error(error.message);return data as CommerceContract;
}
export async function issueDocument(contractId: string,kind: 'Proposal'|'Invoice',part?: string) {
  const { data,error } = await supabase.rpc('digital_issue_document',{p_contract:contractId,p_kind:kind,p_part:part || null});
  if (error) throw new Error(error.message); return data;
}
export async function collectPayment(contract: string,part: string,amount: number,method: string,reference: string,date: string,key: string) {
  const { data,error } = await supabase.rpc('digital_collect_payment',{p_contract:contract,p_part:part,p_amount:amount,p_method:method,p_reference:reference,p_date:date,p_key:key});
  if (error) throw new Error(error.message); return data;
}
export async function dispatchDigitalMail() {
  const { data,error } = await supabase.functions.invoke('send-digital-document',{body:{}});
  if (error) throw new Error('Documents saved; email delivery needs retry or server configuration');
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function refundPayment(collection: string,amount: number,reason: string,key: string) {
  const {data,error}=await supabase.rpc('digital_refund_payment',{p_collection:collection,p_amount:amount,p_reason:reason,p_key:key});
  if(error)throw new Error(error.message);return data;
}
export async function updateTerm(contract: CommerceContract, part: string, label: string, due: string, reason: string) {
  const { data, error } = await supabase.rpc('digital_update_term', { p_contract: contract.id, p_revision: contract.revision, p_part: part, p_label: label, p_due: due, p_reason: reason });
  if (error) throw new Error(error.message);
  return data as CommerceContract;
}
