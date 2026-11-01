import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return response({error:'POST required'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
  const {data:{user},error:authError}=await caller.auth.getUser();
  if(authError||!user)return response({error:'Authentication required'},401);
  const {data:allowed,error:roleError}=await caller.rpc('digital_is_admin');
  if(roleError||!allowed)return response({error:'Digital admin required'},403);
  const key=Deno.env.get('RESEND_API_KEY'),sender=Deno.env.get('DIGITAL_FROM_EMAIL');
  if(!key||!sender)return response({error:'Configure RESEND_API_KEY and DIGITAL_FROM_EMAIL on the server. Documents remain queued.'},503);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await db.from('digital_mail_outbox').update({status:'Failed',error:'Interrupted delivery; retry with the same provider idempotency key'}).eq('status','Sending').lt('updated_at',new Date(Date.now()-15*60*1000).toISOString());
  const {data:jobs,error}=await db.from('digital_mail_outbox').select('*').in('status',['Queued','Failed']).lt('attempts',10).order('created_at').limit(20);
  if(error)throw error;
  let sent=0,failed=0;
  for(const job of jobs||[]){
   const {data:claim}=await db.from('digital_mail_outbox').update({status:'Sending',attempts:job.attempts+1,updated_at:new Date().toISOString()}).eq('id',job.id).eq('status',job.status).eq('attempts',job.attempts).select('id');
   if(!claim?.length)continue;
   try{
    const {data:doc,error:docError}=await db.from('digital_financial_documents').select('*').eq('id',job.document_id).single();
    if(docError)throw docError;
    const b=doc.body,fmt=(n:number)=>new Intl.NumberFormat('en',{style:'currency',currency:b.currency}).format(Number(n||0));
    const html=`<h1>${escape(b.agency_name||'Ferex Digital')}</h1><p>${escape(b.agency_address)}<br>${escape(b.agency_tax_number)}</p><h2>${escape(doc.kind)} ${escape(doc.number)}</h2><p>Hello ${escape(b.client_name)},</p><p>${escape(b.project_title)} · ${escape(b.country)}</p><table><tr><th>Service</th><th>Amount</th><th>Tax</th></tr>${(b.document_lines||b.lines).map((l:any)=>`<tr><td>${escape(l.title)}</td><td>${escape(fmt(l.amount))}</td><td>${escape(l.tax_label)} ${escape(l.tax_rate)}% · ${escape(fmt(l.tax_amount))}</td></tr>`).join('')}</table><p>Contract reference total including tax: ${escape(fmt(b.total))}</p><h3>${escape(b.part?.label||'Payment terms')}</h3>${b.parts.map((p:any)=>`<p>${escape(p.label)} · ${escape(p.due_date)} · ${escape(fmt(p.amount))}</p>`).join('')}<p>${doc.kind==='Receipt'?'Received':'Amount'}: <strong>${escape(fmt(b.amount))}</strong></p>${b.balance!==undefined?`<p>Remaining on this term: ${escape(fmt(b.balance))}</p>`:''}<p>${escape(b.notes)}</p><p>${escape(b.payment_instructions)}</p>`;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`digital-${doc.id}`},body:JSON.stringify({from:sender,to:[job.recipient],subject:`${doc.kind} ${doc.number} — ${b.project_title}`,html})});
    const result=await r.json();if(!r.ok||!result.id)throw new Error(result.message||'Email provider rejected delivery');
    const {error:saveError}=await db.from('digital_mail_outbox').update({status:'Sent',provider_id:result.id,error:null,updated_at:new Date().toISOString()}).eq('id',job.id);
    if(saveError)throw saveError;sent++;
   }catch(e){failed++;await db.from('digital_mail_outbox').update({status:'Failed',error:String(e).slice(0,500),updated_at:new Date().toISOString()}).eq('id',job.id);}
  }
  return response({sent,failed});
 }catch(e){return response({error:String(e)},500);}
});
