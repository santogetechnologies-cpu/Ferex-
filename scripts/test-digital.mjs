import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function sourceModule(path){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));}
const {validateCommerce,currencyDigits,escapeHtml}=await sourceModule('src/lib/digitalCommerce.ts');
const {meetingTimestamp}=await sourceModule('src/lib/digitalTime.ts');
const contract=()=>({project_id:'project',project_title:'International website',client_name:'Client',client_email:'client@example.com',country:'AE',currency:'USD',notes:'',lines:[{id:'design',title:'Design',amount:100.01,tax_rate:5,tax_label:'VAT'}],parts:[{id:'advance',label:'Advance',percentage:30,due_date:'2026-11-01',service_ids:['design']},{id:'delivery',label:'Delivery',percentage:70,due_date:'2026-12-01',service_ids:['design']}]});
test('international service tax uses configured rate and minor units',()=>assert.deepEqual(validateCommerce(contract()),{subtotal:100.01,tax:5,total:105.01}));
test('zero-rated international contracts',()=>{const c=contract();c.lines[0].tax_rate=0;assert.equal(validateCommerce(c).total,100.01);});
test('currency precision supports zero and three decimal currencies',()=>{assert.equal(currencyDigits('JPY'),0);assert.equal(currencyDigits('KWD'),3);const c=contract();c.currency='KWD';c.lines[0].amount=100.123;assert.equal(validateCommerce(c).tax,5.006);});
for(const [name,change] of [
 ['negative amounts',c=>c.lines[0].amount=-1],['non-finite amounts',c=>c.lines[0].amount=NaN],['invalid taxes',c=>c.lines[0].tax_rate=101],
 ['invalid percentages',c=>c.parts[0].percentage=20],['empty terms',c=>c.parts=[]],['unlinked services',c=>c.parts.forEach(p=>p.service_ids=[])],
 ['unknown service links',c=>c.parts[0].service_ids=['other']],['duplicate service IDs',c=>c.lines.push({...c.lines[0]})],['invalid email',c=>c.client_email='broken'],
 ['missing country',c=>c.country=''],['invalid currency',c=>c.currency='usd']])test(`rejects ${name}`,()=>{const c=contract();change(c);assert.throws(()=>validateCommerce(c));});
test('document rendering escapes script and attribute injection',()=>assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
test('meeting time preserves local selected hour rather than fixed UTC noon',()=>{const value=meetingTimestamp('2026-11-02','03:30 PM');const d=new Date(value);assert.equal(d.getHours(),15);assert.equal(d.getMinutes(),30);assert.equal(new Date(meetingTimestamp('2026-11-02','12:00 AM')).getHours(),0);});
test('invalid meeting times rejected',()=>{assert.throws(()=>meetingTimestamp('2026-11-02','13:60 PM'));assert.throws(()=>meetingTimestamp('bad','03:00 PM'));});
test('browser admin client does not create a privileged session',()=>{const s=fs.readFileSync('src/lib/adminAuthClient.ts','utf8');assert.ok(!s.includes('signInWithPassword'));assert.ok(!s.includes('Password'));});
test('source authorization no longer accepts browser-only user identity',()=>{const s=fs.readFileSync('src/App.tsx','utf8');assert.ok(!s.includes('localSavedUser'));assert.ok(s.includes('if (!session || !effectiveUser)'));});
