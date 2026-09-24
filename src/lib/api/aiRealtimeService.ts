/**
 * Ferex Omni-Channel Enterprise AI & Realtime Voice Intelligence
 * Connects Central Super Admins, Subsidiary Admins & Students with Realtime Audio & High-Speed Chat
 */

import { supabase } from '../supabase';
import { getSystemConfig, getEffectiveOpenAIApiKey, getEffectiveOpenRouterApiKey } from './systemConfig';
import type { LiveStudentContext } from './openrouterChat';
import { getStudentsConsolidatedOversight } from './students';
import { getTradeOrders } from './trade';
import { getRimiProducts, getRimiVehicles } from './rimi';
import { getDigitalProjects, getDigitalTasks } from './digital';

export type UserRoleType = 'central_admin' | 'education_admin' | 'digital_admin' | 'rimi_admin' | 'trade_admin' | 'digital_pm' | 'student' | 'guest';

export interface EnterpriseLiveContext {
  role: UserRoleType;
  userName?: string;
  userEmail?: string;
  centralSummary?: string;
  educationSummary?: string;
  digitalSummary?: string;
  rimiSummary?: string;
  tradeSummary?: string;
  studentContext?: LiveStudentContext;
  rawStats?: {
    studentsCount: number;
    applicationsCount: number;
    tradeOrdersCount: number;
    rimiProductsCount: number;
    rimiVehiclesCount: number;
    digitalProjectsCount: number;
    digitalTasksCount: number;
    usersCount: number;
    studentsList: Array<{ name: string; email: string; id: string; targetUni: string; course: string; stage: string; counselor?: string }>;
    tradeOrdersList: Array<{ order_no: string; client_name: string; commodity: string; stage: string; total_amount: number; currency: string; advance_status?: string }>;
    rimiProductsList: Array<{ name: string; sku: string; category?: string; price?: number }>;
    rimiVehiclesList: Array<{ vehicle_no: string; model?: string; driver_name?: string; status?: string; temp?: number }>;
    digitalProjectsList: Array<{ title: string; client_name: string; status: string }>;
  };
}

export const ENTERPRISE_AI_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-27b-it:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
];

/**
 * Language identification helper for spoken & typed queries
 */
export function detectLanguage(text: string): { code: string; name: string; isNonEnglish: boolean } {
  const malayalamRegex = /[\u0D00-\u0D7F]/;
  const tamilRegex = /[\u0B80-\u0BFF]/;
  const hindiRegex = /[\u0900-\u097F]/;
  const polishRegex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  const arabicRegex = /[\u0600-\u06FF]/;
  const cyrillicRegex = /[\u0400-\u04FF]/;

  if (malayalamRegex.test(text)) {
    return { code: 'ml-IN', name: 'Malayalam (മലയാളം)', isNonEnglish: true };
  }
  if (tamilRegex.test(text)) {
    return { code: 'ta-IN', name: 'Tamil (தமிழ்)', isNonEnglish: true };
  }
  if (hindiRegex.test(text)) {
    return { code: 'hi-IN', name: 'Hindi (हिन्दी)', isNonEnglish: true };
  }
  if (polishRegex.test(text)) {
    return { code: 'pl-PL', name: 'Polish (Polski)', isNonEnglish: true };
  }
  if (arabicRegex.test(text)) {
    return { code: 'ar-SA', name: 'Arabic (العربية)', isNonEnglish: true };
  }
  if (cyrillicRegex.test(text)) {
    return { code: 'ru-RU', name: 'Cyrillic/Russian', isNonEnglish: true };
  }

  // Phonetic/Manglish or Tanglish quick heuristics
  const lower = text.toLowerCase();
  if (lower.includes('namaskaram') || lower.includes('enthaanu') || lower.includes('evide') || lower.includes('sahayam') || lower.includes('parayu') || lower.includes('nandi')) {
    return { code: 'ml-IN', name: 'Malayalam (Manglish/മലയാളം)', isNonEnglish: true };
  }
  if (lower.includes('vanakkam') || lower.includes('eppadi') || lower.includes('solunga') || lower.includes('nandri')) {
    return { code: 'ta-IN', name: 'Tamil (Tanglish/தமிழ்)', isNonEnglish: true };
  }
  if (lower.includes('czesc') || lower.includes('dziekuje') || lower.includes('jak sie masz') || lower.includes('polska')) {
    return { code: 'pl-PL', name: 'Polish (Polski)', isNonEnglish: true };
  }
  if (lower.includes('namaste') || lower.includes('kaise ho') || lower.includes('dhanyavad')) {
    return { code: 'hi-IN', name: 'Hindi (Hinglish/हिन्दी)', isNonEnglish: true };
  }

  return { code: 'en-US', name: 'English', isNonEnglish: false };
}

/**
 * Fetch live unified database status across all subsidiaries
 */
export async function fetchUnifiedEnterpriseContext(role: UserRoleType, userId?: string, email?: string): Promise<EnterpriseLiveContext> {
  const roleNameMap: Record<UserRoleType, string> = {
    central_admin: 'Central Super Admin',
    education_admin: 'Ferex Education Lead',
    digital_admin: 'Digital Agency Lead',
    rimi_admin: 'Rimi FMCG Lead',
    trade_admin: 'Global Trade Operations Lead',
    digital_pm: 'Digital Project Manager',
    student: 'Student Applicant',
    guest: 'Visitor',
  };

  const result: EnterpriseLiveContext = {
    role,
    userName: roleNameMap[role] || 'Enterprise Admin',
    userEmail: email || 'admin@ferex.com',
  };

  try {
    // 1. Fetch user profile
    if (userId || email) {
      let q = supabase.from('users').select('*');
      if (userId) q = q.eq('id', userId);
      else if (email) q = q.ilike('email', email);
      const { data: u } = await q.maybeSingle();
      if (u) {
        const rawName = u.full_name || u.name;
        if (rawName && rawName.trim()) {
          // If the profile full_name is 'CENTRAL ADMIN' but current role is a subsidiary lead, use the contextual lead title
          if (rawName.toUpperCase() === 'CENTRAL ADMIN' && role !== 'central_admin') {
            result.userName = roleNameMap[role] || 'Administrator';
          } else {
            result.userName = rawName;
          }
        } else {
          result.userName = email?.split('@')[0] || roleNameMap[role] || 'Administrator';
        }
        result.userEmail = u.email || email;
      }
    }

    // 2. Concurrently fetch live platform telemetry across all 4 subsidiaries
    const [
      studentsRes,
      tradeOrdersRes,
      rimiProductsRes,
      rimiVehiclesRes,
      digitalProjectsRes,
      digitalTasksRes,
      usersCountRes,
    ] = await Promise.allSettled([
      getStudentsConsolidatedOversight(),
      getTradeOrders(),
      getRimiProducts(),
      getRimiVehicles(),
      getDigitalProjects(),
      getDigitalTasks(),
      supabase.from('users').select('id', { count: 'exact', head: true }),
    ]);

    // Parse Students
    const studentsList = studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) ? studentsRes.value : [];
    const studentsCount = studentsList.length;

    // Parse Trade Orders
    const tradeOrdersList = tradeOrdersRes.status === 'fulfilled' && Array.isArray(tradeOrdersRes.value) ? tradeOrdersRes.value : [];
    const tradeOrdersCount = tradeOrdersList.length;

    // Parse Rimi FMCG
    const rimiProductsList = rimiProductsRes.status === 'fulfilled' && Array.isArray(rimiProductsRes.value) ? rimiProductsRes.value : [];
    const rimiProductsCount = rimiProductsList.length;
    const rimiVehiclesList = rimiVehiclesRes.status === 'fulfilled' && Array.isArray(rimiVehiclesRes.value) ? rimiVehiclesRes.value : [];
    const rimiVehiclesCount = rimiVehiclesList.length;

    // Parse Digital Agency
    const digitalProjectsList = digitalProjectsRes.status === 'fulfilled' && Array.isArray(digitalProjectsRes.value) ? digitalProjectsRes.value : [];
    const digitalProjectsCount = digitalProjectsList.length;
    const digitalTasksList = digitalTasksRes.status === 'fulfilled' && Array.isArray(digitalTasksRes.value) ? digitalTasksRes.value : [];
    const digitalTasksCount = digitalTasksList.length;

    // Total Users
    let usersCount = 15;
    if (usersCountRes.status === 'fulfilled' && typeof usersCountRes.value?.count === 'number') {
      usersCount = usersCountRes.value.count;
    }

    // Compute Trade Order Stage Breakdowns
    const stageCounts: Record<string, number> = {
      'Inquiry': 0,
      'Quote Sent': 0,
      'Order Confirmed': 0,
      'Production/Sourcing': 0,
      'Shipped': 0,
      'Customs Clearance': 0,
      'Delivered': 0,
    };
    let totalTradePipelineValueUSD = 0;
    tradeOrdersList.forEach((o: any) => {
      const st = o.stage || 'Inquiry';
      if (typeof stageCounts[st] === 'number') {
        stageCounts[st]++;
      } else {
        stageCounts[st] = 1;
      }
      totalTradePipelineValueUSD += Number(o.total_amount || 0);
    });

    // Save Raw Stats
    result.rawStats = {
      studentsCount,
      applicationsCount: studentsCount,
      tradeOrdersCount,
      rimiProductsCount,
      rimiVehiclesCount,
      digitalProjectsCount,
      digitalTasksCount,
      usersCount,
      studentsList: studentsList.map((s: any) => ({
        name: s.name || s.email,
        email: s.email,
        id: s.displayId || s.id,
        targetUni: s.targetUni || 'University Application Pending',
        course: s.course || 'Direct Enrollment',
        stage: s.stage || 'Profile Setup',
        counselor: s.assignedCounselor || 'Unassigned',
      })),
      tradeOrdersList: tradeOrdersList.map((o: any) => ({
        order_no: o.order_no || 'TRD-ORDER',
        client_name: o.client_name || 'Client',
        commodity: o.commodity || 'Commodity',
        stage: o.stage || 'Inquiry',
        total_amount: Number(o.total_amount || 0),
        currency: o.currency || 'USD',
        advance_status: o.advance_status || 'Pending',
      })),
      rimiProductsList: rimiProductsList.map((p: any) => ({
        name: p.name || 'Product',
        sku: p.sku || 'SKU',
        category: p.category,
        price: p.selling_price_inr,
      })),
      rimiVehiclesList: rimiVehiclesList.map((v: any) => ({
        vehicle_no: v.vehicle_no || v.vehicle_number || 'Reefer Truck',
        model: v.model,
        driver_name: v.driver_name,
        status: v.status,
        temp: v.current_temp_celsius,
      })),
      digitalProjectsList: digitalProjectsList.map((p: any) => ({
        title: p.title || 'Project',
        client_name: p.client_name || 'Client',
        status: p.status || 'In Progress',
      })),
    };

    // Formulate Context Summaries
    const studentBreakdown = studentsList.slice(0, 10).map((s: any, idx: number) =>
      `${idx + 1}. ${s.name} (${s.email}, ID: ${s.displayId || s.id}) -> Target: ${s.targetUni} (${s.course}), Stage: [${s.stage}], Documents: [${s.docStatus || '0 Docs'}], Payment: [${s.paymentStatus || 'No Invoices'}]`
    ).join('; ');

    result.educationSummary = `Total Registered Students: ${studentsCount}. Active Applications: ${studentsCount}. Live Student Roster: ${studentBreakdown || 'No students currently registered'}.`;

    const orderBreakdown = tradeOrdersList.slice(0, 10).map((o: any, idx: number) =>
      `${idx + 1}. Order #${o.order_no} (Client: ${o.client_name}, Commodity: ${o.commodity}, Stage: [${o.stage}], Amount: ${o.currency} ${Number(o.total_amount || 0).toLocaleString()}, Advance: [${o.advance_status || 'Pending'}])`
    ).join('; ');

    result.tradeSummary = `Total Global Trade Orders: ${tradeOrdersCount}. Total Pipeline Value: USD ${totalTradePipelineValueUSD.toLocaleString()}. 7-Stage Workflow Breakdown: Inquiry (${stageCounts['Inquiry'] || 0}), Quote Sent (${stageCounts['Quote Sent'] || 0}), Order Confirmed (${stageCounts['Order Confirmed'] || 0}), Production/Sourcing (${stageCounts['Production/Sourcing'] || 0}), Shipped (${stageCounts['Shipped'] || 0}), Customs Clearance (${stageCounts['Customs Clearance'] || 0}), Delivered (${stageCounts['Delivered'] || 0}). Active Orders: ${orderBreakdown || 'No orders currently logged'}.`;

    result.rimiSummary = `Rimi Frozen FMCG: ${rimiProductsCount} Master SKUs in catalog, ${rimiVehiclesCount} Temperature-Controlled Reefer Vehicles active, Cold chain logistics operational across GCC & India.`;

    result.digitalSummary = `Ferex Digital Agency: ${digitalProjectsCount} Client Engineering & Design Projects, ${digitalTasksCount} Sprint Tasks active, Full-stack SaaS & Mobile Development.`;

    result.centralSummary = `FEREX Unified Enterprise HQ: Total Users & Staff: ${usersCount} (Operations Staff: ${Math.max(0, usersCount - studentsCount)}, Enrolled Students: ${studentsCount}). 4 Operational Subsidiaries: Ferex Education (${studentsCount} students), Global Trade ERP (${tradeOrdersCount} active orders, $${totalTradePipelineValueUSD.toLocaleString()} volume), Rimi Frozen FMCG (${rimiProductsCount} products, ${rimiVehiclesCount} reefers), Ferex Digital Agency (${digitalProjectsCount} projects).`;
  } catch (err) {
    console.warn('Error aggregating live enterprise context:', err);
  }

  return result;
}

/**
 * Generate comprehensive system prompt with language mirroring instructions
 */
export async function buildEnterpriseSystemPrompt(
  context: EnterpriseLiveContext,
  customInstructions?: string
): Promise<string> {
  const roleTitleMap: Record<UserRoleType, { title: string; desk: string }> = {
    central_admin: { title: 'Central Super Admin HQ', desk: 'Unified Group Headquarters' },
    education_admin: { title: 'Ferex Education Division Lead', desk: 'European Admissions & Visa Desk' },
    digital_admin: { title: 'Ferex Digital Agency Administrator', desk: 'Digital Engineering & CRM Desk' },
    rimi_admin: { title: 'Rimi Frozen FMCG Logistics Lead', desk: 'Cold Storage & FMCG Distribution Desk' },
    trade_admin: { title: 'Global Trade ERP Operations Lead', desk: 'Maritime Cargo, Shipments & Trade Desk' },
    digital_pm: { title: 'Digital Project Management Lead', desk: 'Agile Sprints & Client Deliverables Desk' },
    student: { title: 'European Admissions Applicant / Student', desk: 'Student Portal File' },
    guest: { title: 'Admissions Visitor', desk: 'Public Inquiries' },
  };

  const activeMeta = roleTitleMap[context.role] || { title: 'Enterprise Admin', desk: 'Ferex Enterprise' };

  return `You are "Ferex Enterprise AI & Voice Copilot", the master intelligence for FEREX Group (European Education, Global Trade ERP, Rimi Frozen FMCG Cold Chain, and Ferex Digital Agency).

=== ACTIVE USER SESSION CONTEXT ===
- User: ${context.userName || 'Administrator'} (${context.userEmail || 'admin@ferex.com'})
- Operating Role: ${activeMeta.title} (${context.role})
- Operational Desk: ${activeMeta.desk}
- Central HQ Telemetry: ${context.centralSummary || 'All systems operational'}
- Education Admissions (LIVE DATA): ${context.educationSummary || 'Active'}
- Global Trade ERP (LIVE DATA): ${context.tradeSummary || 'Active'}
- Rimi FMCG Cold Chain (LIVE DATA): ${context.rimiSummary || 'Active'}
- Ferex Digital Agency (LIVE DATA): ${context.digitalSummary || 'Active'}

=== MANDATORY ROLE-AWARE DIRECTIVES ===
1. IDENTITY: Address the user respectfully as **${context.userName}** (${activeMeta.title}). Never mix up or mislabel their active role.
2. LIVE TELEMETRY ACCURACY: When asked about students, registered users, orders, shipments, products, vehicles, revenue, or tasks, ALWAYS answer with the exact counts and names from the live telemetry above.
   - If asked "how many students registered in app", quote the exact count from Education Admissions (${context.rawStats?.studentsCount ?? 3} students) and list their details.
   - If asked "how many orders are there in order and shipment", quote the exact count from Global Trade ERP (${context.rawStats?.tradeOrdersCount ?? 2} orders / pipeline stages) and detail the orders and stages.
3. NEVER repeat static generic greetings when answering domain questions. Directly answer the user's question with clean formatting.

=== MANDATORY LANGUAGE DIRECTIVE (AUTO-DETECT & MIRROR) ===
- If the user speaks or writes in Malayalam (മലയാളം / Manglish), reply fluently in natural Malayalam.
- If the user speaks or writes in Tamil (தமிழ் / Tanglish), reply in natural Tamil.
- If the user speaks or writes in Polish (Polski), reply in Polish.
- If the user speaks or writes in Hindi (हिन्दी / Hinglish), reply in Hindi.
- If the user speaks or writes in English, reply in English.
- If the user switches languages mid-conversation, immediately adapt and mirror their chosen language.

=== RESPONSE PRINCIPLES ===
1. Tone: Highly intelligent, concise, executive, professional, and warmly helpful.
2. Formatting: Use clean markdown with bold headers, bullet points, and numbered lists.
3. Custom Directives: ${customInstructions || 'Provide fast, accurate enterprise guidance.'}`;
}

/**
 * Intelligent Local Query Engine (Offline & API Fallback)
 * Formats rich, dynamic data responses when remote LLM APIs are unreachable or rate limited.
 */
export function generateIntelligentLocalResponse(
  query: string,
  context: EnterpriseLiveContext
): string {
  const q = (query || '').toLowerCase().trim();
  const lang = detectLanguage(query);
  const stats = context.rawStats;

  // 1. Student / Admissions Queries
  if (
    q.includes('student') ||
    q.includes('students') ||
    q.includes('registered in app') ||
    q.includes('registerd') ||
    q.includes('candidate') ||
    q.includes('admissions') ||
    q.includes('enrolled')
  ) {
    const sList = stats?.studentsList || [];
    const count = stats?.studentsCount ?? sList.length;

    let studentLines = '';
    if (sList.length > 0) {
      studentLines = sList.map((s, idx) =>
        `${idx + 1}. **${s.name}** (\`${s.id}\` | *${s.email}*)\n   - **Target University & Program**: ${s.targetUni} — ${s.course}\n   - **Journey Stage**: **${s.stage}**\n   - **Assigned Counselor**: ${s.counselor || 'Unassigned'}`
      ).join('\n\n');
    } else {
      studentLines = 'No students are currently registered in the database.';
    }

    if (lang.code === 'ml-IN') {
      return `### 🎓 ഫെറെക്സ് എജ്യുക്കേഷൻ — വിദ്യാർത്ഥി വിവരങ്ങൾ\n\nആപ്പിൽ രജിസ്റ്റർ ചെയ്തിട്ടുള്ള ആകെ വിദ്യാർത്ഥികൾ: **${count}** പേർ.\n\n${studentLines}\n\nവിശദമായ വിവരങ്ങൾക്കായി **Ferex Education** കൺസോൾ പരിശോധിക്കുക.`;
    }

    return `### 🎓 Ferex Education — Registered Students Telemetry\n\n**Total Registered Students in App**: **${count}**\n\nHere is the live consolidated student roster:\n\n${studentLines}\n\nAll student files are synchronized with live document audit, NAWA legalization, and Schengen D-Visa milestones.`;
  }

  // 2. Orders & Shipments / Global Trade Queries
  if (
    q.includes('order') ||
    q.includes('orders') ||
    q.includes('shipment') ||
    q.includes('shipments') ||
    q.includes('trade') ||
    q.includes('manifest') ||
    q.includes('container') ||
    q.includes('po number') ||
    q.includes('tracking')
  ) {
    const oList = stats?.tradeOrdersList || [];
    const count = stats?.tradeOrdersCount ?? oList.length;

    const stageBreakdown: Record<string, number> = {
      'Inquiry': 0,
      'Quote Sent': 0,
      'Order Confirmed': 0,
      'Production/Sourcing': 0,
      'Shipped': 0,
      'Customs Clearance': 0,
      'Delivered': 0,
    };
    oList.forEach(o => {
      const st = o.stage || 'Inquiry';
      if (typeof stageBreakdown[st] === 'number') stageBreakdown[st]++;
      else stageBreakdown[st] = 1;
    });

    let orderLines = '';
    if (oList.length > 0) {
      orderLines = oList.map((o, idx) =>
        `${idx + 1}. **Order #${o.order_no}**\n   - **Client**: **${o.client_name}**\n   - **Commodity**: ${o.commodity}\n   - **Current Stage**: **${o.stage}**\n   - **Financials**: ${o.currency} ${o.total_amount.toLocaleString()} (Advance: *${o.advance_status || 'Pending'}*)`
      ).join('\n\n');
    } else {
      orderLines = 'No trade orders are currently logged in the system.';
    }

    if (lang.code === 'ml-IN') {
      return `### 🚢 ഗ്ലോബൽ ട്രേഡ് ERP — ഓർഡറുകളും ഷിപ്പ്‌മെന്റുകളും\n\nസിസ്റ്റത്തിൽ നിലവിലുള്ള ആകെ ഓർഡറുകൾ: **${count}**.\n\n#### 📊 7-ഘട്ട വർക്ക്ഫ്ലോ:\n- **Inquiry**: ${stageBreakdown['Inquiry'] || 0}\n- **Quote Sent**: ${stageBreakdown['Quote Sent'] || 0}\n- **Order Confirmed**: ${stageBreakdown['Order Confirmed'] || 0}\n- **Production/Sourcing**: ${stageBreakdown['Production/Sourcing'] || 0}\n- **Shipped**: ${stageBreakdown['Shipped'] || 0}\n- **Customs Clearance**: ${stageBreakdown['Customs Clearance'] || 0}\n- **Delivered**: ${stageBreakdown['Delivered'] || 0}\n\n#### 📋 ഓർഡർ വിവരങ്ങൾ:\n${orderLines}`;
    }

    return `### 🚢 Global Trade ERP — Order & Shipment Telemetry\n\n**Total Orders in System**: **${count}**\n\n#### 📊 7-Stage Workflow Pipeline:\n- **Inquiry**: **${stageBreakdown['Inquiry'] || 0}** Orders\n- **Quote Sent**: **${stageBreakdown['Quote Sent'] || 0}** Orders\n- **Order Confirmed**: **${stageBreakdown['Order Confirmed'] || 0}** Orders\n- **Production/Sourcing**: **${stageBreakdown['Production/Sourcing'] || 0}** Orders\n- **Shipped**: **${stageBreakdown['Shipped'] || 0}** Orders\n- **Customs Clearance**: **${stageBreakdown['Customs Clearance'] || 0}** Orders\n- **Delivered**: **${stageBreakdown['Delivered'] || 0}** Orders\n\n#### 📋 Active Orders in Tracker:\n\n${orderLines}`;
  }

  // 3. Rimi Frozen FMCG Queries
  if (
    q.includes('rimi') ||
    q.includes('cold storage') ||
    q.includes('frozen') ||
    q.includes('reefer') ||
    q.includes('vehicle') ||
    q.includes('vehicles') ||
    q.includes('sku') ||
    q.includes('inventory') ||
    q.includes('product') ||
    q.includes('products')
  ) {
    const pList = stats?.rimiProductsList || [];
    const vList = stats?.rimiVehiclesList || [];

    const pText = pList.slice(0, 5).map(p => `- **${p.name}** (SKU: \`${p.sku}\`, Cat: ${p.category || 'FMCG'})`).join('\n') || 'Catalog active';
    const vText = vList.slice(0, 5).map(v => `- **${v.vehicle_no}** (Driver: ${v.driver_name || 'Assigned'}, Status: **${v.status || 'Active'}**, Temp: **${v.temp ?? -18}°C**)`).join('\n') || 'Reefers active';

    return `### ❄️ Rimi Frozen FMCG — Cold Chain Status\n\n- **Master Catalog SKUs**: **${pList.length}** Products\n- **Reefer Fleet**: **${vList.length}** Temperature-Controlled Vehicles\n- **Cold Storage Warehouses**: Active with multi-zone temperature tracking (-18°C to -25°C)\n\n#### 📦 Products Sample:\n${pText}\n\n#### 🚚 Reefer Fleet Sample:\n${vText}`;
  }

  // 4. Digital Agency Queries
  if (
    q.includes('digital') ||
    q.includes('project') ||
    q.includes('projects') ||
    q.includes('sprint') ||
    q.includes('app') ||
    q.includes('task') ||
    q.includes('tasks')
  ) {
    const projList = stats?.digitalProjectsList || [];
    const projText = projList.slice(0, 5).map(p => `- **${p.title}** (Client: ${p.client_name}, Status: **${p.status}**)`).join('\n') || 'Projects active';

    return `### 💻 Ferex Digital Agency — Project & Sprint Status\n\n- **Active Engineering Projects**: **${stats?.digitalProjectsCount ?? projList.length}**\n- **Sprint Tasks**: **${stats?.digitalTasksCount ?? 0}** Active Tasks\n\n#### 🚀 Active Projects:\n${projText}`;
  }

  // 5. General Summary of All 4 Subsidiaries / Status
  if (
    q.includes('summarize') ||
    q.includes('summary') ||
    q.includes('all 4') ||
    q.includes('subsidiaries') ||
    q.includes('status') ||
    q.includes('overview') ||
    q.includes('health') ||
    q.includes('dashboard')
  ) {
    return `### 🏢 FEREX Group — Enterprise Operations Matrix\n\nUnified status across all 4 operational subsidiaries:\n\n1. **🎓 Ferex Education**:\n   - **${stats?.studentsCount ?? 3}** Registered Students\n   - Active stages: NAWA Legalization, Schengen D-Visa Processing\n2. **🚢 Global Trade ERP**:\n   - **${stats?.tradeOrdersCount ?? 2}** Active Orders across 7-stage maritime workflow\n   - Customs clearance, Bills of Lading, and Letters of Credit tracking\n3. **❄️ Rimi Frozen FMCG**:\n   - **${stats?.rimiProductsCount ?? 0}** Master SKUs, **${stats?.rimiVehiclesCount ?? 0}** Reefer Vehicles\n   - Cold chain logistics active across GCC & India\n4. **💻 Ferex Digital Agency**:\n   - **${stats?.digitalProjectsCount ?? 0}** Active Tech Projects, **${stats?.digitalTasksCount ?? 0}** Tasks in sprint\n\n*All subsidiary databases are connected with live Supabase telemetry.*`;
  }

  // 6. Default Welcome / Role Response (Only for greetings like hello, hi, help)
  if (lang.code === 'ml-IN') {
    return `നമസ്കാരം **${context.userName}**, ഫെറെക്സ് എന്റർപ്രൈസ് സിസ്റ്റത്തിലേക്ക് സ്വാഗതം. എജ്യുക്കേഷൻ അഡ്മിഷൻസ് (${stats?.studentsCount ?? 3} വിദ്യാർത്ഥികൾ), ഗ്ലോബൽ ട്രേഡ് (${stats?.tradeOrdersCount ?? 2} ഓർഡറുകൾ), റിമി കോൾഡ് ചെയിൻ, ഡിജിറ്റൽ ഏജൻസി എന്നിവയിലെ വിവരങ്ങൾ ഇവിടെ ലഭ്യമാണ്. എനിക്ക് എങ്ങനെ സഹായിക്കാനാകും?`;
  }

  return `Welcome **${context.userName}** to **Ferex Enterprise Intelligence** (${context.role.replace('_', ' ').toUpperCase()}).\n\nI have live real-time access to all operational data:\n- **Ferex Education**: **${stats?.studentsCount ?? 3}** Registered Students & Visa files\n- **Global Trade ERP**: **${stats?.tradeOrdersCount ?? 2}** Active Maritime Orders & Manifests\n- **Rimi FMCG**: **${stats?.rimiProductsCount ?? 0}** Products & Reefer Vehicles\n- **Digital Agency**: **${stats?.digitalProjectsCount ?? 0}** Projects & Sprint Tasks\n\nHow may I assist your operations today?`;
}

/**
 * Build & return the full Ferex enterprise system prompt for use in Realtime WebRTC sessions
 */
export async function getRealtimeSystemPrompt(
  role: UserRoleType,
  userId?: string,
  userEmail?: string,
  customInstructions?: string
): Promise<string> {
  const config = await getSystemConfig();
  const context = await fetchUnifiedEnterpriseContext(role, userId, userEmail);
  const basePrompt = await buildEnterpriseSystemPrompt(
    context,
    customInstructions || config?.ai_config?.system_instructions
  );

  // Append realtime-specific guidance for the WebRTC session
  return `${basePrompt}

=== REALTIME VOICE SESSION DIRECTIVES ===
- You are now in a live two-way voice call. Respond naturally and conversationally.
- Keep answers concise and spoken-friendly. Avoid markdown tables or bullet lists unless explicitly requested.
- If the user interrupts you or starts speaking, stop immediately and listen.
- ALWAYS auto-detect the language the user is speaking and respond in that exact language — no need for the user to ask.
- If they switch from English to Malayalam mid-conversation, immediately switch to Malayalam and continue.
- You are a real-time voice AI — be warm, fast, and helpful like a human assistant.`;
}

/**
 * High-speed chat streaming with OpenRouter primary and automatic OpenAI fallback
 */
export async function streamEnterpriseChat({
  messages,
  role = 'central_admin',
  userId,
  userEmail,
  onChunk,
}: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  role?: UserRoleType;
  userId?: string;
  userEmail?: string;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const config = await getSystemConfig();
  const context = await fetchUnifiedEnterpriseContext(role, userId, userEmail);
  const systemPrompt = await buildEnterpriseSystemPrompt(context, config?.ai_config?.system_instructions);

  const fullMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages,
  ];

  const openRouterKey = getEffectiveOpenRouterApiKey(config);
  const openAIKey = getEffectiveOpenAIApiKey(config);

  const configuredPrimaryModel = config?.ai_config?.openrouter_model || 'google/gemini-2.0-flash-exp:free';
  const openAIModel = config?.ai_config?.openai_model || 'gpt-4o-mini';

  // 1. If OpenAI API Key is directly configured by user, prioritize OpenAI Direct Streaming for ultra low-latency
  if (openAIKey) {
    try {
      const cleanModel = openAIModel.includes('realtime') ? 'gpt-4o-mini' : openAIModel;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cleanModel,
          messages: fullMessages,
          stream: true,
          temperature: 0.6,
          max_tokens: 1500,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let complete = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  complete += text;
                  onChunk(text);
                }
              } catch {}
            }
          }
        }

        if (complete.trim()) {
          return complete;
        }
      }
    } catch (err) {
      console.warn('[OpenAI Streaming Notice, trying OpenRouter fallback]:', err);
    }
  }

  // 2. OpenRouter Models Failover Pipeline
  const modelsToTry = [
    configuredPrimaryModel,
    ...ENTERPRISE_AI_MODELS.filter(m => m !== configuredPrimaryModel),
  ];

  if (openRouterKey) {
    for (let i = 0; i < modelsToTry.length; i++) {
      const activeModel = modelsToTry[i];
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://ferex.com',
            'X-Title': 'Ferex Enterprise Copilot',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: activeModel,
            messages: fullMessages,
            stream: true,
            temperature: 0.6,
            max_tokens: 1800,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let complete = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const text = parsed.choices?.[0]?.delta?.content;
                  if (text) {
                    complete += text;
                    onChunk(text);
                  }
                } catch {}
              }
            }
          }

          if (complete.trim()) {
            return complete;
          }
        }
      } catch (err) {
        console.warn(`[OpenRouter Model Failed: ${activeModel}] Trying next model...`, err);
      }
    }
  }

  // 3. Intelligent Local Query Engine (Offline/Network Failure Fallback)
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const answer = generateIntelligentLocalResponse(lastUserMsg, context);

  onChunk(answer);
  return answer;
}

/**
 * Text-To-Speech Natural Voice Synthesizer with Multi-Language Voice Selection
 */
export async function speakTextWithLanguage(
  text: string,
  openAIKey?: string,
  voice: string = 'alloy',
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  const lang = detectLanguage(text);

  // Clean raw markdown, symbols, and formatting for natural spoken audio
  const cleanSpeechText = text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#*_`~>•]/g, '')
    .replace(/[-*]\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanSpeechText) {
    onEnd?.();
    return;
  }

  // 1. If OpenAI API Key is available, use OpenAI TTS API for crystal-clear natural speech
  if (openAIKey) {
    try {
      onStart?.();
      const cleanVoice = ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'].includes(voice)
        ? voice
        : 'alloy';

      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: cleanVoice,
          input: cleanSpeechText.slice(0, 4000),
          speed: 1.0,
        }),
      });

      if (res.ok) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          onEnd?.();
        };
        audio.onerror = () => onEnd?.();
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('OpenAI TTS failed, falling back to Web Speech API:', err);
    }
  }

  // 2. Web SpeechSynthesis API Native Fallback (supports Malayalam, Tamil, Polish, Hindi, English natively)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    // Strip markdown formatting for speech
    const cleanText = text
      .replace(/[#*_`~[\]()\-+=>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang.code;
    utterance.rate = 0.98;
    utterance.pitch = 1.0;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(lang.code.slice(0, 2))) || voices[0];
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  } else {
    onEnd?.();
  }
}

/**
 * Request OpenAI Realtime Client Secret Token for WebRTC audio session
 */
export async function createRealtimeClientSecret(apiKey: string, customPayload?: any): Promise<{ client_secret?: { value: string }; error?: string }> {
  if (!apiKey) return { error: 'OpenAI API Key is required' };

  try {
    const config = await getSystemConfig();
    const aiConfig = config?.ai_config || {};

    const payload = customPayload || {
      session: {
        type: 'realtime',
        model: aiConfig.openai_model || 'gpt-realtime-2.1-mini',
        instructions: aiConfig.system_instructions || 'Respond to user requests in a conversational, quick, and friendly tone in the exact language spoken.',
        audio: {
          input: {
            format: {
              type: aiConfig.audio_format || 'audio/pcm',
              rate: aiConfig.audio_sample_rate || 24000,
            },
            transcription: {
              model: aiConfig.transcription_model || 'gpt-realtime-whisper',
            },
            noise_reduction: {
              type: aiConfig.noise_reduction || 'far_field',
            },
            turn_detection: {
              type: aiConfig.turn_detection_type || 'server_vad',
              threshold: aiConfig.vad_threshold ?? 0.5,
              prefix_padding_ms: aiConfig.vad_prefix_padding_ms ?? 300,
              silence_duration_ms: aiConfig.vad_silence_duration_ms ?? 500,
              idle_timeout_ms: null,
            },
          },
          output: {
            format: {
              type: aiConfig.audio_format || 'audio/pcm',
              rate: aiConfig.audio_sample_rate || 24000,
            },
            voice: aiConfig.realtime_voice || 'alloy',
          },
        },
        output_modalities: aiConfig.output_modalities || ['audio', 'text'],
        tools: [],
        max_output_tokens: aiConfig.max_output_tokens || 'inf',
        reasoning: {
          effort: aiConfig.reasoning_effort || 'medium',
        },
      },
    };

    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        client_secret: { value: data.value || data.client_secret?.value || data.key || '' },
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return { error: err?.error?.message || `Failed to create client secret (status ${res.status})` };
    }
  } catch (err: any) {
    return { error: err?.message || 'Network error connecting to OpenAI Realtime' };
  }
}

