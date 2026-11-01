import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const id='10000000-0000-4000-8000-000000000001',projectId='20000000-0000-4000-8000-000000000001',clientId='30000000-0000-4000-8000-000000000001';
const user={id,email:'digital-admin@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{full_name:'Digital Admin'},created_at:'2026-11-01T00:00:00Z'};
const profile={...user,full_name:'Digital Admin',role:'digital_admin',phone:'',department:'Digital'};
let endpoint='https://ouvezsfvdkecpugzuhuk.supabase.co';for(const f of ['.env','.env.local'])if(fs.existsSync(f)){const m=fs.readFileSync(f,'utf8').match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m);if(m)endpoint=m[1];}
const settings={agency_name:'Ferex Digital',address:'Agency address',tax_number:'TEST',default_currency:'USD',taxes:[{id:'vat',label:'VAT',rate:5,country:'AE'},{id:'none',label:'No tax',rate:0,country:'*'}],services:[{id:'web',name:'Web Development'}],terms:[{id:'half',name:'50/50',parts:[{label:'Advance',percentage:50,days:0,service_ids:[]},{label:'Delivery',percentage:50,days:30,service_ids:[]}]}]};
test.beforeEach(async({page})=>{
 const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,email:user.email,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
 await page.addInitScript(({key,user,token})=>{if(sessionStorage.getItem('test-no-session'))return;localStorage.setItem(key,JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));},{key:`sb-${new URL(endpoint).hostname.split('.')[0]}-auth-token`,user,token});
 await page.route('**/*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').pop()||'';
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','content-type':'application/json'};
  let value:any=[];
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
  if(url.pathname.includes('/auth/v1/user'))value=user;
  else if(url.pathname.includes('/auth/v1/logout'))value={};
  else if(name==='users')value=req.headers().accept?.includes('object')?profile:[profile];
  else if(name==='system_config')value={value:{branding:{agency_name:'Ferex Digital'},client_policies:{},delivery_rules:{},broadcast:{},services:[]}};
  else if(name==='digital_commerce_settings')value={config:settings};
  else if(name==='digital_staff_directory')value=[{id,name:'Digital Admin',email:user.email,role:'digital_admin'}];
  else if(name==='digital_projects')value=[{id:projectId,title:'International Website',client_id:clientId,client_name:'Global Client',client_type:'External',status:'Briefing',service_category:'Web',currency:'USD',country:'AE',budget:100,progress:0,deliverables:[],stage_history:[],assigned_staff_id:id,assigned_staff_name:'Digital Admin',assigned_staff_email:user.email,created_at:'2026-11-01',updated_at:'2026-11-01',payment_status:'Pending',payment_terms:'Advance Payment',advance_amount:50,balance_amount:50}];
  else if(name==='digital_clients')value=[{id:clientId,company_name:'Global Client',contact_person:'Client',email:'client@example.com',status:'Active',country:'AE',currency:'USD',client_type:'External',tags:[],created_at:'2026-11-01'}];
  else if(name==='get_global_email_config')value={};
  return route.fulfill({status:200,headers,body:JSON.stringify(value)});
 });
});
for(const route of ['dashboard','clients','attendance','projects','deliverables','tasks','leads','meetings','billing','invoices','payments','expenses','analytics','notifications','emails','profile','settings'])test(`Digital ${route} renders without runtime errors`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`/digital/${route}`);await expect(page.getByRole('heading').first()).toBeVisible();await page.waitForTimeout(500);expect(errors).toEqual([]);await expect(page).toHaveURL(new RegExp(`/digital/${route}`));
});
test('configure international scope with tax, services and payment terms',async({page})=>{
 let saved:any;
 await page.route('**/rest/v1/rpc/digital_save_contract',async route=>{const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'};if(route.request().method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});saved=route.request().postDataJSON();await route.fulfill({headers,json:{id:crypto.randomUUID(),revision:1,project_id:projectId,body:saved.p_body}});});
 await page.goto('/digital/billing');await page.getByRole('button',{name:'Configure project billing'}).click();
 await page.getByRole('combobox',{name:'Project',exact:true}).selectOption(projectId);await page.getByRole('button',{name:'Add service',exact:true}).click();await page.getByLabel('Service',{exact:true}).fill('Web Development');await page.getByLabel('Net amount',{exact:true}).fill('100.01');await page.getByRole('combobox',{name:'Tax rule',exact:true}).selectOption('vat');await page.getByRole('combobox').filter({has:page.locator('option[value="half"]')}).selectOption('half');
 await page.screenshot({path:'reports/digital-international-billing.png',fullPage:true});
 await page.getByRole('button',{name:'Save configuration',exact:true}).click();await expect(page.getByRole('status')).toContainText('Billing saved');expect(saved.p_body.currency).toBe('USD');expect(saved.p_body.country).toBe('AE');expect(saved.p_body.lines[0].tax_rate).toBe(5);expect(saved.p_body.parts[0].service_ids).toHaveLength(1);
});
test('Sign Out revokes the session and returns to login',async({page})=>{
 let signedOut=false;await page.route('**/auth/v1/logout*',async route=>{if(route.request().method()==='POST')signedOut=true;await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'},body:''});});await page.goto('/digital/dashboard');await page.getByRole('button',{name:'Sign Out',exact:true}).first().click();await expect(page).toHaveURL(/\/digital\/login/);expect(signedOut).toBe(true);
});
test('browser-only administrator identity cannot bypass sign-in',async({page})=>{
 await page.goto('/digital/login');await page.evaluate(()=>{sessionStorage.setItem('test-no-session','true');localStorage.clear();localStorage.setItem('ferex_user',JSON.stringify({id:'fake',role:'superadmin',email:'fake@example.com'}));});await page.goto('/digital/dashboard');await expect(page).toHaveURL(/\/digital\/login/);
});
test('profile loading failure offers retry instead of granting a fallback role',async({page})=>{
 await page.route('**/rest/v1/users*',route=>{const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,OPTIONS'};return route.request().method()==='OPTIONS'?route.fulfill({status:200,headers,body:''}):route.fulfill({status:403,headers,json:{message:'Profile access denied'}});});await page.goto('/digital/dashboard');await expect(page.getByRole('alert')).toContainText('account profile could not be loaded');
});
