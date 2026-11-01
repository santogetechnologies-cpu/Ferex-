import React,{useEffect,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {getDigitalProjects} from '../../lib/api/digital';
import {commerceList} from '../../lib/api/digitalCommerce';
import {money} from '../../lib/digitalCommerce';
import {ChangePasswordForm} from '../../components/ChangePasswordForm';
export default function DigitalClientWorkspace(){
 const {profile,signOut}=useAuth();const [projects,setProjects]=useState<any[]>([]),[contracts,setContracts]=useState<any[]>([]),[documents,setDocuments]=useState<any[]>([]),[error,setError]=useState('');
 const load=async()=>{try{const [p,c,d]=await Promise.all([getDigitalProjects(),commerceList('digital_contracts'),commerceList('digital_financial_documents')]);setProjects(p);setContracts(c);setDocuments(d);setError('');}catch(e:any){setError(e.message);}};
 useEffect(()=>{void load();},[]);
 return <main className="max-w-5xl mx-auto p-6 space-y-6 text-slate-900"><header className="flex justify-between"><div><h1 className="text-2xl font-bold">Your Digital Projects</h1><p>{profile?.full_name}</p></div><button onClick={async()=>{await signOut();window.location.assign('/digital/login');}}>Sign Out</button></header>{error&&<p role="alert">{error}</p>}<button className="underline" onClick={load}>Refresh</button>
 {projects.map(p=><article key={p.id} className="bg-white border p-5 rounded-xl space-y-3"><h2 className="font-bold">{p.title}</h2><p>{p.status} · {p.progress}% · deadline {p.deadline||'To be agreed'}</p><p>{p.scope}</p>{(p.deliverables||[]).filter((d:any)=>/^https?:\/\//.test(d.url)).map((d:any)=><p key={d.id}><a className="underline" href={d.url} target="_blank" rel="noopener noreferrer">{d.title}</a> · {d.status}</p>)}</article>)}
 {contracts.map(c=><section key={c.id} className="bg-white p-5 border rounded-xl space-y-3"><h2 className="font-bold">{c.body.project_title} · agreed scope & payment terms</h2>{c.body.lines.map((l:any)=><p key={l.id}>{l.title} · {money(l.amount,c.body.currency)} · {l.tax_label} ({l.tax_rate}%)</p>)}<p>Total including tax: {money(c.body.total,c.body.currency)}</p>{c.body.parts.map((p:any)=><p key={p.id}>{p.label} · due {p.due_date} · {money(p.amount,c.body.currency)} · received {money(p.received,c.body.currency)} · balance {money(p.amount-p.received,c.body.currency)}</p>)}<p>{c.body.payment_instructions}</p><p className="text-sm text-slate-600">Use the payment instructions agreed with your agency. Partial payments can be recorded against an instalment by the agency after funds are received.</p></section>)}
 <h2 className="text-xl font-bold">Proposals, invoices & receipts</h2>{documents.map(d=><details key={d.id} className="bg-white border p-4 rounded-xl"><summary>{d.kind} · {d.number} · {money(d.body.amount,d.body.currency)}</summary><p>{d.body.project_title} · {d.body.part?.label}</p><p>{d.body.notes}</p><p>{new Date(d.created_at).toLocaleDateString()}</p><button className="underline" onClick={()=>window.print()}>Print / save PDF</button></details>)}
 {!projects.length&&!error&&<p>No projects have been linked to your account yet.</p>}<ChangePasswordForm/>
 </main>;
}
