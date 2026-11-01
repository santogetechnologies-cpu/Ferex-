import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'};
const reply=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return reply({});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
  const {data:role}=await caller.rpc('ferex_role');
  const central=['central','superadmin','super_admin'].includes(role);
  if(!central&&!['digital','digital_admin','ferex_digital'].includes(role))return reply({error:'Administrator required'},403);
  const body=await req.json(),allowed=['digital_client','digital_staff','project_manager','designer','developer'];
  const centralRoles=[...allowed,'digital_admin','trade_admin','logistics_officer','rimi_admin','operations_manager','education_admin','staff','counselor','student'];
  if(!(central?centralRoles:allowed).includes(body.role))return reply({error:'Invalid role'},400);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||'')||!body.full_name?.trim())return reply({error:'Valid name and email required'},400);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if(body.role==='digital_client'){
   const {data:client}=await db.from('digital_clients').select('id,email').eq('id',body.client_id).single();
   if(!client||client.email.toLowerCase()!==body.email.toLowerCase())return reply({error:'Email must match the client record'},400);
  }
  const {data,error}=await db.auth.admin.inviteUserByEmail(body.email,{data:{full_name:body.full_name},redirectTo:Deno.env.get('APP_URL')?`${Deno.env.get('APP_URL')}/reset-password`:undefined});
  if(error)throw error;
  const {error:roleError}=await db.auth.admin.updateUserById(data.user.id,{app_metadata:{role:body.role}});if(roleError)throw roleError;
  const department=body.role.startsWith('trade')||body.role==='logistics_officer'?'Trade':body.role.startsWith('rimi')||body.role==='operations_manager'?'Rimi':['education_admin','staff','counselor','student'].includes(body.role)?'Education':'Digital';
  const {error:profileError}=await db.from('users').update({role:body.role,department,full_name:body.full_name,...(typeof body.phone==='string'?{phone:body.phone.trim()}:{})}).eq('id',data.user.id);if(profileError)throw profileError;
  if(body.role==='digital_client'){const {error:linkError}=await db.from('digital_client_users').insert({user_id:data.user.id,client_id:body.client_id});if(linkError)throw linkError;}
  return reply({user:{id:data.user.id,email:body.email},invited:true});
 }catch(e){return reply({error:String(e)},400);}
});
