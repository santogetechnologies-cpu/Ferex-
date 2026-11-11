import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Starting Vite server...');
  const server = await createServer({
    configFile: path.resolve(process.cwd(), 'vite.config.ts'),
    server: { port: 5199, strictPort: true }
  });
  await server.listen();
  console.log('Vite server running at http://localhost:5199');

  console.log('Launching Chrome browser...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Student auth setup
  const studentId = '10000000-0000-4000-8000-000000000001';
  const user = {
    id: studentId,
    email: 'student@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: 'Rahul Sharma', role: 'student' },
    created_at: '2026-01-01'
  };
  const profile = { id: studentId, email: user.email, full_name: 'Rahul Sharma', role: 'student' };
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: studentId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
    'test'
  ].join('.');

  const signedAgreement = {
    id: 'agr_20261111_001',
    student_id: studentId,
    student_name: 'Rahul Sharma',
    student_email: 'student@example.com',
    company_address: '12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691',
    contact_numbers: ['+91 95448 85077', '+44 78678 67779'],
    official_email: 'ferexventuresoffice@gmail.com',
    signature_data: 'Rahul Sharma',
    signature_type: 'typed',
    signed_at: '2026-11-11T10:00:00.000Z',
    registration_fee: 1500,
    application_fee: 25000,
    visa_fee: 15000,
    currency: 'INR',
    status: 'Signed',
    version: '2026.1'
  };

  await page.addInitScript(({ user, profile, token, signedAgreement }) => {
    const session = {
      access_token: token,
      refresh_token: 'test',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user
    };
    localStorage.setItem('sb-ouvezsfvdkecpugzuhuk-auth-token', JSON.stringify(session));
    localStorage.setItem('ferex_user', JSON.stringify({ ...user, profile }));
    localStorage.setItem('ferex_role', 'student');
    localStorage.setItem(`ferex_service_agreement_${user.id}`, JSON.stringify(signedAgreement));
  }, { user, profile, token, signedAgreement });

  await page.route('**/*.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const name = url.pathname.split('/').pop();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'content-type': 'application/json'
    };

    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' });

    let result = [];
    if (url.pathname.includes('/auth/v1/user')) result = user;
    else if (name === 'users') result = [profile];
    else if (name === 'education_service_agreements') result = [{ body: signedAgreement }];
    else if (name === 'education_workflow_progress') result = [{ id: 's2', student_id: studentId, stage_number: 2, stage_name: 'Service agreement', status: 'Completed' }];
    else if (name === 'system_config') {
      result = [{
        key: 'fee_config',
        value: {
          advance_registration_fee_enabled: true,
          advance_registration_fee_amount: 1500,
          visa_documents_fee_enabled: true,
          visa_documents_fee_amount: 25000,
          separate_agency_fee_enabled: true,
          agency_fee_amount: 15000,
          education_fees: [{ currency: 'INR' }]
        }
      }];
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify(result) });
  });

  console.log('Navigating to http://localhost:5199/student/agreement...');
  await page.goto('http://localhost:5199/student/agreement', { waitUntil: 'networkidle' });

  // Wait for the agreement document sheet to appear
  await page.waitForSelector('#student-service-agreement', { timeout: 10000 });
  console.log('Page loaded successfully.');

  // Verify elements in SCREEN mode
  const screenTitle = await page.title();
  console.log(`[Screen Mode] Document Title: "${screenTitle}"`);
  console.log(`[Screen Mode] Sidebar visible: ${await page.locator('aside').isVisible()}`);
  console.log(`[Screen Mode] Header visible: ${await page.locator('header').isVisible()}`);
  console.log(`[Screen Mode] Print / Save PDF button visible: ${await page.getByRole('button', { name: /Print \/ Save PDF/i }).isVisible()}`);

  // Emulate print media
  console.log('\nEmulating PRINT media (@media print)...');
  await page.emulateMedia({ media: 'print' });

  // Trigger beforeprint handler
  await page.evaluate(() => {
    window.dispatchEvent(new Event('beforeprint'));
  });

  const printTitle = await page.title();
  console.log(`[Print Mode] Document Title during print: "${printTitle}" (Must be empty to suppress title in native header)`);

  // Evaluate element visibility in print mode
  const printCheck = await page.evaluate(() => {
    function isElementHiddenInPrint(el) {
      if (!el) return true;
      const style = window.getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    }

    const aside = document.querySelector('aside');
    const header = document.querySelector('header');
    const topBannerButtons = document.querySelector('button:has(.lucide-printer)')?.closest('.print\\:hidden');
    const agreementDoc = document.querySelector('#student-service-agreement');

    const companyHeader = agreementDoc?.querySelector('.agreement-print-header');
    const companyName = companyHeader?.innerText.includes('FEREX EDUCATION');
    const docTitle = agreementDoc?.querySelector('.agreement-print-title')?.innerText.includes('SERVICE AGREEMENT');
    const clauses = agreementDoc?.querySelectorAll('.agreement-clause')?.length;
    const feeTable = !!agreementDoc?.querySelector('.agreement-fee-table');
    const sigBlock = !!agreementDoc?.querySelector('.agreement-signature-block');
    const studentName = agreementDoc?.querySelector('.agreement-signature-block')?.innerText.includes('Rahul Sharma');
    const printFooter = !!agreementDoc?.querySelector('.print\\:flex');

    const asideHidden = isElementHiddenInPrint(aside);
    const headerHidden = isElementHiddenInPrint(header);
    const topBannerHidden = isElementHiddenInPrint(topBannerButtons);
    const docVisible = agreementDoc && !isElementHiddenInPrint(agreementDoc);

    return {
      asideHidden,
      headerHidden,
      topBannerHidden,
      docVisible,
      companyName,
      docTitle,
      clausesCount: clauses,
      feeTable,
      sigBlock,
      studentName,
      printFooter
    };
  });

  console.log('\n--- PRINT EVALUATION RESULTS ---');
  console.log('Sidebar hidden in print:', printCheck.asideHidden);
  console.log('Header hidden in print:', printCheck.headerHidden);
  console.log('Top banner / buttons hidden in print:', printCheck.topBannerHidden);
  console.log('Agreement document visible in print:', printCheck.docVisible);
  console.log('Company name in agreement:', printCheck.companyName);
  console.log('Service Agreement title present:', printCheck.docTitle);
  console.log('Agreement clauses count:', printCheck.clausesCount);
  console.log('Fee table present:', printCheck.feeTable);
  console.log('Signature block present:', printCheck.sigBlock);
  console.log('Student name in signature block:', printCheck.studentName);
  console.log('Print document footer present:', printCheck.printFooter);

  // Generate PDF with displayHeaderFooter: true (even with browser native headers enabled)
  const outputDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const pdfPath = path.join(outputDir, 'service-agreement-printed.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    displayHeaderFooter: false,
    printBackground: true
  });
  console.log(`PDF saved to: ${pdfPath}`);

  // Trigger afterprint handler
  await page.evaluate(() => {
    window.dispatchEvent(new Event('afterprint'));
  });

  const restoredTitle = await page.title();
  console.log(`[After Print] Document Title restored: "${restoredTitle}"`);

  await browser.close();
  await server.close();

  const success =
    printTitle === '' &&
    restoredTitle.includes('FEREX') &&
    printCheck.asideHidden &&
    printCheck.headerHidden &&
    printCheck.topBannerHidden &&
    printCheck.docVisible &&
    printCheck.companyName &&
    printCheck.docTitle &&
    printCheck.clausesCount >= 13 &&
    printCheck.feeTable &&
    printCheck.sigBlock &&
    printCheck.studentName;

  if (success) {
    console.log('\n>>> ALL PRINT & UNWANTED HEADER REMOVAL CHECKS PASSED SUCCESSFULLY! <<<');
    process.exit(0);
  } else {
    console.error('\n>>> SOME CHECKS FAILED! <<<');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
