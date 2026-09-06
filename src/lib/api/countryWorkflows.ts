import { supabase } from '../supabase';
import type { CountryWorkflowConfig } from '../types';

export const DEFAULT_COUNTRY_WORKFLOWS: CountryWorkflowConfig[] = [
  {
    id: 'wf-poland',
    country: 'Poland',
    authority_name: 'Polish National Agency for Academic Exchange (NAWA)',
    authority_acronym: 'NAWA',
    authority_badge: 'Polish NAWA Legalization',
    authority_description: 'Mandatory Polish government qualification equivalency, sworn Polish translation, and Kuratorium verification required for all non-EU secondary and higher education diplomas.',
    estimated_processing_days: '14 - 21 Days',
    authority_fee: '€250',
    website_url: 'https://nawa.gov.pl/en/',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Academic Profile Audit & Sworn Translation',
        short_name: 'Audit & Translation',
        description: 'Submission of high school marksheets or Bachelor degree transcripts to certified Polish sworn translators and initial eligibility audit.',
        responsible_party: 'ferex_admin',
        required_docs: ['Original Degree Transcripts', 'High School Marksheets', 'Passport Copy', 'English MOI Certificate'],
        estimated_days: '3-5 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: 'NAWA Warsaw Legalization Filing',
        short_name: 'NAWA Submission',
        description: 'Official application filing to the NAWA electronic portal in Warsaw with sworn translations and certification of educational comparability.',
        responsible_party: 'authority',
        required_docs: ['NAWA Application Form', 'Apostille Certificate', 'Sworn Polish Translations'],
        estimated_days: '7-14 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'NAWA Comparability Statement Release',
        short_name: 'NAWA Approved',
        description: 'Receipt of the official NAWA Statement of Comparability granting legal right to study at Polish higher education institutions.',
        responsible_party: 'ferex_admin',
        required_docs: ['Official NAWA Certificate'],
        estimated_days: '2-4 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'University Tuition Deposit & Final Acceptance',
        short_name: 'University Acceptance',
        description: 'Direct payment of tuition fee to official university IBAN and issuance of the Final Acceptance Letter (Zaświadczenie o przyjęciu na studia).',
        responsible_party: 'university',
        required_docs: ['Tuition Payment Swift Receipt', 'Final Acceptance Certificate'],
        estimated_days: '3-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'VFS Visa Appointment & Embassy Mock Interview',
        short_name: 'VFS Visa Filing',
        description: 'Confirmed VFS Global appointment booking, complete consular docket compilation, and 1-on-1 embassy mock interview preparation.',
        responsible_party: 'student',
        required_docs: ['Bank Statement Proof of Funds (€2,500)', 'Accommodation Dorm Contract', 'Schengen Travel Insurance (€30,000)'],
        estimated_days: '10-20 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 6,
        title: 'National D Schengen Visa Stamped & Pre-Departure',
        short_name: 'Visa Stamped',
        description: 'Receipt of National D visa passport stamp, Warsaw/Krakow airport pickup scheduling, and Karta Pobytu residence permit roadmap.',
        responsible_party: 'ferex_admin',
        required_docs: ['Stamped Passport Copy', 'Flight Ticket Confirmation'],
        estimated_days: '3-5 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: 'doc-pass-pl', name: 'Valid International Passport (Min 1.5 yr validity)', category: 'identity', is_mandatory: true, instructions: 'Clear color scan of all pages with biodata and previous travel visas.' },
      { id: 'doc-acad-pl', name: '10th, 12th & Bachelor Degree Marksheets', category: 'academic', is_mandatory: true, instructions: 'Attested academic transcripts issued by official exam board / university.' },
      { id: 'doc-moi-pl', name: 'Medium of Instruction (MOI) Certificate in English', category: 'academic', is_mandatory: true, instructions: 'Certificate from previous institute stating education was taught 100% in English.' },
      { id: 'doc-apos-pl', name: 'Apostille Attestation (Ministry of External Affairs)', category: 'legalization', is_mandatory: true, instructions: 'State HRD and Ministry Apostille stamp on original educational degree.' },
      { id: 'doc-bank-pl', name: 'Bank Solvency Statement & Sponsorship Proof', category: 'financial', is_mandatory: true, instructions: '6 months bank statement showing minimum €2,500 - €3,500 equivalent living funds.' },
      { id: 'doc-med-pl', name: 'Schengen Travel Health Insurance (Min €30,000 cover)', category: 'visa', is_mandatory: true, instructions: '1-year comprehensive medical insurance valid across all Schengen nations.' }
    ],
    visa_procedures: {
      visa_type: 'National Type D Student Visa (Schengen Area)',
      financial_proof_req: '€2,500 - €3,500 Bank Solvency Proof + Sponsorship Affidavit',
      insurance_req: '€30,000 Schengen Travel Medical Insurance covering entire 1st year',
      appointment_channel: 'VFS Global Polish Visa Application Center',
      interview_required: true,
      notes: 'Embassy interview focuses on student motivation, university course syllabus understanding, and post-study career plans.'
    }
  },
  {
    id: 'wf-germany',
    country: 'Germany',
    authority_name: 'Akademische Prüfstelle (APS) & Uni-Assist',
    authority_acronym: 'APS',
    authority_badge: 'German APS Verification',
    authority_description: 'Mandatory academic verification certificate issued by the German Embassy APS bureau & Uni-Assist preliminary documentation evaluation (VPD).',
    estimated_processing_days: '25 - 35 Days',
    authority_fee: '₹18,500',
    website_url: 'https://aps-india.info/',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Academic Transcript & DigiLocker Verification',
        short_name: 'Document Audit',
        description: 'Compilation of university transcripts, professor references, and school leaving certificates for APS German verification.',
        responsible_party: 'ferex_admin',
        required_docs: ['University Transcripts', 'DigiLocker Verified Marksheets', 'Passport Copy'],
        estimated_days: '5-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: 'APS Application Filing & Courier Submission',
        short_name: 'APS Filing',
        description: 'Submission of physical document dossier to the German Embassy APS center and fee clearance.',
        responsible_party: 'authority',
        required_docs: ['APS Application Form', 'Bank Challan Receipt', 'Notarized Transcripts'],
        estimated_days: '14-25 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'APS Digital Certificate Release',
        short_name: 'APS Issued',
        description: 'Issuance of the digital APS Certificate granting eligibility to apply to public and private German universities.',
        responsible_party: 'ferex_admin',
        required_docs: ['Digital APS Certificate (PDF)'],
        estimated_days: '2-3 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'Uni-Assist VPD & University Admission Offer',
        short_name: 'University Offer',
        description: 'Preliminary Documentation Verification (VPD) via Uni-Assist and release of official German university Zulassungsbescheid.',
        responsible_party: 'university',
        required_docs: ['Uni-Assist VPD', 'Zulassungsbescheid (Admission Offer)'],
        estimated_days: '7-14 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'Blocked Account (Sperrkonto) Deposit (€11,208)',
        short_name: 'Blocked Account',
        description: 'Setup and funding of government-mandated German Blocked Account (Expatrio / Coracle / Fintiba) and statutory health insurance.',
        responsible_party: 'student',
        required_docs: ['Blocked Account Opening Confirmation (05-Certificate)', 'German Health Insurance (TK / Barmer)'],
        estimated_days: '3-5 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 6,
        title: 'VFS German Student Visa Appointment & Stamping',
        short_name: 'Visa Stamped',
        description: 'National D Study Visa appointment, biometric registration, and German residence permit onboarding.',
        responsible_party: 'ferex_admin',
        required_docs: ['Blocked Account 06 Balance Confirmation', 'APS Certificate Original', 'University Offer Letter'],
        estimated_days: '15-25 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: 'doc-pass-de', name: 'Valid Passport (Min 2 years validity)', category: 'identity', is_mandatory: true, instructions: 'Color scan of front, back and all stamped passport pages.' },
      { id: 'doc-aps-de', name: 'APS Digital Verification Certificate', category: 'legalization', is_mandatory: true, instructions: 'Mandatory certificate from the German Embassy Academic Evaluation Centre.' },
      { id: 'doc-deg-de', name: 'All University Semester Marksheets & Degree', category: 'academic', is_mandatory: true, instructions: 'Complete semester-wise marksheets with grading scale conversion.' },
      { id: 'doc-lang-de', name: 'English MOI / IELTS / German Proficiency', category: 'academic', is_mandatory: true, instructions: 'MOI or IELTS (Min 6.5) / German A1/B1 if applicable.' },
      { id: 'doc-block-de', name: 'Sperrkonto (Blocked Account) Proof (€11,208)', category: 'financial', is_mandatory: true, instructions: 'Official blocked amount confirmation certificate for 1-year living expenses.' },
      { id: 'doc-ins-de', name: 'German Statutory / Travel Health Insurance', category: 'visa', is_mandatory: true, instructions: 'Techniker Krankenkasse (TK) or statutory German incoming student insurance.' }
    ],
    visa_procedures: {
      visa_type: 'National Visa Category D for Study (Aufenthaltserlaubnis)',
      financial_proof_req: '€11,208 / year Blocked Account (Sperrkonto) with monthly release of €934',
      insurance_req: 'German statutory health insurance (TK / Barmer / DAK) or equivalent coverage',
      appointment_channel: 'VFS Global German Visa Application Center / Consular Mission',
      interview_required: true,
      notes: 'German visa applicants must present original APS certificate and Blocked Account Confirmation Letter at the VFS counter.'
    }
  },
  {
    id: 'wf-italy',
    country: 'Italy',
    authority_name: 'CIMEA & Declaration of Value (DoV) / Universitaly',
    authority_acronym: 'CIMEA',
    authority_badge: 'Italian CIMEA Statement',
    authority_description: 'Statement of Comparability and Verification issued by CIMEA and compulsory Universitaly portal pre-enrollment summary.',
    estimated_processing_days: '14 - 30 Days',
    authority_fee: '€150',
    website_url: 'https://www.cimea.it/en/',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Academic Apostille & Sworn Italian Translation',
        short_name: 'Apostille & Translation',
        description: 'MEA Apostille certification and sworn Italian translation of high school and Bachelor certificates.',
        responsible_party: 'ferex_admin',
        required_docs: ['Apostilled Degree', 'Sworn Italian Translation', 'Transcript with ECTS credits'],
        estimated_days: '4-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: 'CIMEA Statement of Comparability Filing',
        short_name: 'CIMEA Filing',
        description: 'Submission of diplomas to the CIMEA DiploMe platform for verification and comparability certificate release.',
        responsible_party: 'authority',
        required_docs: ['CIMEA Application Dossier', 'Official Transcript'],
        estimated_days: '14-21 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'Universitaly Portal Pre-Enrollment Summary',
        short_name: 'Universitaly Approval',
        description: 'Official registration on the Italian Ministry Universitaly portal and university validation of academic qualification.',
        responsible_party: 'university',
        required_docs: ['Universitaly Pre-Enrollment Summary (Riepilogo)'],
        estimated_days: '5-10 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'Regional DSU Scholarship & Fee Waiver Filing',
        short_name: 'DSU Scholarship',
        description: 'Submission of ISEE Parificato documentation for regional tuition fee reduction, subsidized dorms, and living stipend.',
        responsible_party: 'ferex_admin',
        required_docs: ['Family Income Certificate', 'Property Valuation Statement', 'Bank Statement'],
        estimated_days: '7-14 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'VFS Italy National D Study Visa Grant',
        short_name: 'Visa Stamped',
        description: 'Visa docket submission at VFS Italy, flight reservation, and Codice Fiscale tax code registration.',
        responsible_party: 'ferex_admin',
        required_docs: ['Universitaly Summary', 'CIMEA Statement', 'Bank Funds (€6,000)'],
        estimated_days: '15-25 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: 'doc-pass-it', name: 'International Passport', category: 'identity', is_mandatory: true, instructions: 'Passport with at least 3 blank pages and validity exceeding study period.' },
      { id: 'doc-cim-it', name: 'CIMEA Statement of Comparability / Verification', category: 'legalization', is_mandatory: true, instructions: 'Official digital certificate from CIMEA or Italian Embassy Declaration of Value.' },
      { id: 'doc-univ-it', name: 'Universitaly Summary (Riepilogo Pre-Iscrizione)', category: 'academic', is_mandatory: true, instructions: 'Validated summary sheet with Italian University seal of approval.' },
      { id: 'doc-apos-it', name: 'Apostilled Academic Certificates', category: 'legalization', is_mandatory: true, instructions: 'MEA Apostille on all original educational certificates.' },
      { id: 'doc-fin-it', name: 'Bank Solvency Proof (Min €6,000 / academic year)', category: 'financial', is_mandatory: true, instructions: 'Personal or parent bank statement with continuous active balance.' },
      { id: 'doc-ins-it', name: 'Health Insurance with Unlimited Repatriation', category: 'visa', is_mandatory: true, instructions: 'Valid for Italy & Schengen area with minimum €30,000 medical coverage.' }
    ],
    visa_procedures: {
      visa_type: 'National Visa Type D for University Enrollment (Studio/Immatricolazione)',
      financial_proof_req: 'Minimum €467.65 per month of academic year (€6,079.45 total minimum balance)',
      insurance_req: 'Schengen health insurance covering medical emergencies and repatriation (€30,000)',
      appointment_channel: 'VFS Global Italy Visa Application Center',
      interview_required: false,
      notes: 'Universitaly pre-enrollment validation is mandatory before the Italian embassy will accept visa files.'
    }
  },
  {
    id: 'wf-czech',
    country: 'Czech Republic',
    authority_name: 'MEYS State Academic Nostrification (MŠMT)',
    authority_acronym: 'Nostrification',
    authority_badge: 'Czech Nostrification',
    authority_description: 'Official Czech Republic Ministry of Education recognition of foreign high school diplomas and university degrees for higher education matriculation.',
    estimated_processing_days: '20 - 30 Days',
    authority_fee: '€120',
    website_url: 'https://www.msmt.cz/en',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Sworn Czech Translation & Hour-by-Hour Syllabus',
        short_name: 'Translation & Syllabus',
        description: 'Official Czech court sworn translation of academic transcripts and breakdown of lecture hours per subject.',
        responsible_party: 'ferex_admin',
        required_docs: ['Subject-wise Hours Transcript', 'Sworn Czech Translation', 'High School Diploma'],
        estimated_days: '5-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: 'Municipal / University Nostrification Filing',
        short_name: 'Nostrification Submission',
        description: 'Submission to the Prague / Brno Department of Education or direct institutional nostrification evaluation.',
        responsible_party: 'authority',
        required_docs: ['Nostrification Application', 'Legalized Educational Documents'],
        estimated_days: '15-25 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'Nostrification Clause Certificate Release',
        short_name: 'Nostrification Approved',
        description: 'Issuance of the legal Nostrification Certificate equating credentials to the Czech education system.',
        responsible_party: 'ferex_admin',
        required_docs: ['Official Nostrification Certificate'],
        estimated_days: '2-4 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'University Acceptance & Student Dormitory Contract',
        short_name: 'Acceptance & Dorm',
        description: 'Official university matriculation certificate and binding student dorm contract in Prague / Brno.',
        responsible_party: 'university',
        required_docs: ['Rozhodnutí o přijetí (Acceptance)', 'Proof of Accommodation'],
        estimated_days: '5-10 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'Czech Long-Stay Student Visa (D/VC/24) Stamping',
        short_name: 'Visa Stamped',
        description: 'Embassy submission of super-legalized documents, Czech comprehensive health insurance, and visa stamping.',
        responsible_party: 'ferex_admin',
        required_docs: ['Police Clearance with Super-legalization', 'Czech Bank Card & Balance Proof'],
        estimated_days: '30-45 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: 'doc-pass-cz', name: 'Valid International Passport', category: 'identity', is_mandatory: true, instructions: 'Valid for at least 3 months after visa expiry.' },
      { id: 'doc-nost-cz', name: 'Czech Nostrification Certificate', category: 'legalization', is_mandatory: true, instructions: 'Ministry or University equivalence confirmation certificate.' },
      { id: 'doc-pcc-cz', name: 'Police Clearance Certificate (PCC) with Apostille', category: 'legalization', is_mandatory: true, instructions: 'Issued by Passport Seva Kendra / Police and super-legalized.' },
      { id: 'doc-acc-cz', name: 'Proof of Accommodation (Ubytování) in Czech Republic', category: 'visa', is_mandatory: true, instructions: 'Certified confirmation of housing contract from Czech dormitory.' },
      { id: 'doc-bank-cz', name: 'Bank Account Balance & International Payment Card', category: 'financial', is_mandatory: true, instructions: 'Balance of approx. 120,000 CZK (~€5,000) with active international debit card.' },
      { id: 'doc-ins-cz', name: 'Czech Comprehensive Health Insurance (PVZP / Maxima)', category: 'visa', is_mandatory: true, instructions: 'Exclusive Czech medical insurance covering minimum €400,000.' }
    ],
    visa_procedures: {
      visa_type: 'Long-Term Visa for the Purpose of Studies (D/VC/24) / Long-Term Residence Permit',
      financial_proof_req: '120,000 CZK (approx. €5,000) in a bank account under student’s name + international debit card',
      insurance_req: 'Comprehensive Health Insurance from authorized Czech provider (Pojišťovna VZP / Maxima)',
      appointment_channel: 'Embassy of the Czech Republic Consular Section',
      interview_required: true,
      notes: 'All documents submitted to the Czech embassy must be in Czech or accompanied by certified Czech court translations.'
    }
  },
  {
    id: 'wf-france',
    country: 'France',
    authority_name: 'Campus France & Études en France (EEF)',
    authority_acronym: 'Campus France',
    authority_badge: 'Campus France EEF Clearance',
    authority_description: 'Compulsory French government academic appraisal and mandatory pre-visa consular interview.',
    estimated_processing_days: '14 - 21 Days',
    authority_fee: '₹16,500',
    website_url: 'https://www.campusfrance.org/en',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Études en France (EEF) Portal Dossier Creation',
        short_name: 'EEF Registration',
        description: 'Creation of the official pastel file on the French Ministry platform with CV, SOP, and transcripts.',
        responsible_party: 'ferex_admin',
        required_docs: ['CV in French/English', 'SOP', 'Transcripts', 'English MOI'],
        estimated_days: '3-5 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: 'Campus France Academic Officer Interview',
        short_name: 'Campus France Interview',
        description: 'One-on-one interview at Campus France center assessing academic profile and study motivation.',
        responsible_party: 'student',
        required_docs: ['Campus France Appointment Letter', 'Original Diplomas'],
        estimated_days: '5-10 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'Campus France Pre-Consular Clearance Certificate',
        short_name: 'EEF Certificate',
        description: 'Release of the official “Attestation d’Accord Préalable d’Inscription” required for the visa file.',
        responsible_party: 'authority',
        required_docs: ['Official Campus France Clearance Certificate'],
        estimated_days: '2-4 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'University Registration & Tuition Fee Deposit',
        short_name: 'University Deposit',
        description: 'Payment of initial tuition deposit to the French institution and receipt of the final Attestation d’Admission.',
        responsible_party: 'university',
        required_docs: ['Final Admission Certificate', 'Tuition Receipt'],
        estimated_days: '3-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'VFS France Long-Stay Student Visa (VLS-TS) Stamping',
        short_name: 'Visa Stamped',
        description: 'Visa file submission at VFS France, biometrics, and issuance of the VLS-TS Long Stay Student Visa.',
        responsible_party: 'ferex_admin',
        required_docs: ['Campus France Attestation', 'Bank Proof (€615/mo)', 'Accommodation Attestation'],
        estimated_days: '10-18 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: 'doc-pass-fr', name: 'Valid Passport (Min 1.5 yr validity)', category: 'identity', is_mandatory: true, instructions: 'Color scans of all pages.' },
      { id: 'doc-eef-fr', name: 'Campus France Clearance Certificate (Attestation EEF)', category: 'legalization', is_mandatory: true, instructions: 'Mandatory certificate issued after passing the Campus France interview.' },
      { id: 'doc-adm-fr', name: 'Official French University Admission Letter', category: 'academic', is_mandatory: true, instructions: 'Attestation d’inscription issued by accredited Grande École or University.' },
      { id: 'doc-acc-fr', name: 'Attestation d’Hébergement (Proof of Accommodation)', category: 'visa', is_mandatory: true, instructions: 'CROUS dormitory room confirmation or private lease for minimum 3 months.' },
      { id: 'doc-fin-fr', name: 'Proof of Financial Resources (Min €615 / month)', category: 'financial', is_mandatory: true, instructions: 'Bank statements showing minimum €7,380 for 1-year living expenses or loan letter.' },
      { id: 'doc-ins-fr', name: 'Medical & Repatriation Insurance', category: 'visa', is_mandatory: true, instructions: 'Initial travel insurance covering €30,000 until French Sécurité Sociale registration.' }
    ],
    visa_procedures: {
      visa_type: 'Long Stay Student Visa with Residence Permit (Visa de Long Séjour - Titre de Séjour VLS-TS)',
      financial_proof_req: 'Minimum €615 per month for 1 year (total €7,380) through bank balance, sponsor or blocked account',
      insurance_req: 'Schengen travel insurance for arrival, then free French Sécurité Sociale registration upon enrollment',
      appointment_channel: 'VFS Global France Visa Application Center',
      interview_required: true,
      notes: 'Applicants must first complete and pass the Campus France interview before booking the VFS appointment.'
    }
  },
  {
    id: 'wf-spain',
    country: 'Spain',
    authority_name: 'UNEDasiss & Ministry Homologación',
    authority_acronym: 'UNEDasiss',
    authority_badge: 'Spanish Homologación',
    authority_description: 'Validation of foreign university diplomas and high school certificates for Spanish university accreditation.',
    estimated_processing_days: '20 - 40 Days',
    authority_fee: '€140',
    website_url: 'https://unedasiss.uned.es/',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Academic Apostille & Jurado Spanish Translation',
        short_name: 'Apostille & Translation',
        description: 'MEA Hague Apostille and official Traducción Jurada (sworn Spanish translation) of all academic records.',
        responsible_party: 'ferex_admin',
        required_docs: ['Apostilled Transcripts', 'Traductor Jurado Certified Translation'],
        estimated_days: '5-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: 'UNEDasiss Accreditation / Homologación Filing',
        short_name: 'UNEDasiss Submission',
        description: 'Dossier submission to UNEDasiss for foreign degree validation and qualification grade conversion.',
        responsible_party: 'authority',
        required_docs: ['UNEDasiss Credential Application', 'Legalized Transcripts'],
        estimated_days: '15-30 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'Accreditation Credential Release',
        short_name: 'Homologación Issued',
        description: 'Receipt of the official UNEDasiss Credential document granting direct university enrollment rights in Spain.',
        responsible_party: 'ferex_admin',
        required_docs: ['UNEDasiss Credential PDF'],
        estimated_days: '2-4 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'University Matriculation & Housing Contract',
        short_name: 'Enrollment & Housing',
        description: 'University matriculation fee payment and student residence reservation in Madrid / Barcelona / Valencia.',
        responsible_party: 'university',
        required_docs: ['Carta de Admisión (Admission Letter)', 'Proof of Spanish Accommodation'],
        estimated_days: '5-10 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'BLS / Embassy Spanish National Study Visa Grant',
        short_name: 'Visa Stamped',
        description: 'Embassy submission with Spanish private medical insurance (Sanitas / Adeslas) without co-payments.',
        responsible_party: 'ferex_admin',
        required_docs: ['Medical Certificate (WHO 2005)', 'PCC with Apostille', 'Bank Statement (€7,200)'],
        estimated_days: '20-30 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: 'doc-pass-es', name: 'Valid Passport (Min 1 year validity)', category: 'identity', is_mandatory: true, instructions: 'Clean color copy of all pages.' },
      { id: 'doc-uned-es', name: 'UNEDasiss Credential / Homologación Proof', category: 'legalization', is_mandatory: true, instructions: 'Official Spanish accreditation certificate.' },
      { id: 'doc-adm-es', name: 'Official University Admission Letter (Carta de Admisión)', category: 'academic', is_mandatory: true, instructions: 'Official admission letter confirming full-time studies.' },
      { id: 'doc-med-es', name: 'Medical Certificate (International Health Regulations 2005)', category: 'visa', is_mandatory: true, instructions: 'Doctor certificate confirming absence of quarantinable diseases.' },
      { id: 'doc-pcc-es', name: 'Police Clearance Certificate with Apostille & Translation', category: 'legalization', is_mandatory: true, instructions: 'Clean criminal record issued within last 3-6 months.' },
      { id: 'doc-ins-es', name: 'Spanish Full Comprehensive Health Insurance (Sin Copago)', category: 'visa', is_mandatory: true, instructions: 'Insurance from authorized Spanish provider with zero co-payment and unlimited coverage.' }
    ],
    visa_procedures: {
      visa_type: 'National Visa Type D for Studies (Visado de Estudiante)',
      financial_proof_req: '100% of IPREM monthly indicator (approx. €600/month, total €7,200/year) in bank balance',
      insurance_req: 'Private health insurance from a company authorized in Spain (Adeslas / Sanitas) without co-payments',
      appointment_channel: 'BLS International Spain Visa Application Center / Spanish Consulate',
      interview_required: true,
      notes: 'Medical certificate and police clearance must be strictly apostilled and accompanied by certified Spanish translations.'
    }
  }
];

const STORAGE_KEY = 'ferex_country_workflows_v1';

export function getCountryWorkflows(): CountryWorkflowConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading country workflows:', e);
  }
  return DEFAULT_COUNTRY_WORKFLOWS;
}

export function getWorkflowForCountry(countryName?: string): CountryWorkflowConfig {
  const workflows = getCountryWorkflows();
  if (!countryName) return workflows[0] || DEFAULT_COUNTRY_WORKFLOWS[0];

  const matched = workflows.find(
    w => w.country.toLowerCase().trim() === countryName.toLowerCase().trim()
  );

  if (matched) return matched;

  // If new country added by superadmin without specific workflow yet, generate an intuitive default workflow
  return {
    id: `wf-${countryName.toLowerCase().replace(/\s+/g, '-')}`,
    country: countryName,
    authority_name: `${countryName} Ministry Qualification Recognition & Legalization`,
    authority_acronym: `${countryName.slice(0, 4).toUpperCase()} Legalization`,
    authority_badge: `${countryName} Academic Legalization`,
    authority_description: `Official state academic equivalency audit and visa processing procedure for ${countryName}.`,
    estimated_processing_days: '14 - 28 Days',
    authority_fee: '€200',
    is_active: true,
    stages: [
      {
        step_number: 1,
        title: 'Academic Transcript Audit & Certified Translation',
        short_name: 'Document Audit',
        description: `Review and certified translation of transcripts for ${countryName} higher education standards.`,
        responsible_party: 'ferex_admin',
        required_docs: ['Degree Marksheets', 'Passport Copy', 'English MOI Certificate'],
        estimated_days: '4-7 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 2,
        title: `${countryName} State Legalization & Equivalency Filing`,
        short_name: 'Legalization Filing',
        description: `Submission of educational credentials to ${countryName} academic recognition authority.`,
        responsible_party: 'authority',
        required_docs: ['Legalized Transcripts', 'Apostille Certificate'],
        estimated_days: '14-21 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 3,
        title: 'University Offer Letter & Tuition Deposit',
        short_name: 'University Offer',
        description: `Direct release of university admission offer and tuition fee payment confirmation.`,
        responsible_party: 'university',
        required_docs: ['Official University Acceptance Letter', 'Tuition Swift Receipt'],
        estimated_days: '5-10 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 4,
        title: 'Consular Visa Filing & Embassy Mock Interview',
        short_name: 'Visa Filing',
        description: `Embassy/VFS visa appointment booking, financial proof check, and consular mock coaching.`,
        responsible_party: 'student',
        required_docs: ['Bank Solvency Proof', 'Accommodation Contract', 'Travel Insurance'],
        estimated_days: '15-25 Days',
        auto_unlocks_next: true
      },
      {
        step_number: 5,
        title: 'National Student Visa Stamping & Pre-Departure',
        short_name: 'Visa Stamped',
        description: `Visa grant clearance, flight booking, airport reception, and local residence permit onboarding.`,
        responsible_party: 'ferex_admin',
        required_docs: ['Stamped Visa Passport', 'Flight Tickets'],
        estimated_days: '3-5 Days',
        auto_unlocks_next: false
      }
    ],
    checklist_documents: [
      { id: `doc-pass-${countryName.toLowerCase()}`, name: 'Valid International Passport', category: 'identity', is_mandatory: true, instructions: 'Passport with min 1.5 year validity.' },
      { id: `doc-acad-${countryName.toLowerCase()}`, name: 'Academic Marksheets & Degree Transcripts', category: 'academic', is_mandatory: true, instructions: 'Complete educational records.' },
      { id: `doc-moi-${countryName.toLowerCase()}`, name: 'English Medium of Instruction (MOI) Certificate', category: 'academic', is_mandatory: true, instructions: 'Proof of English proficiency.' },
      { id: `doc-fin-${countryName.toLowerCase()}`, name: 'Bank Solvency Statement & Living Funds Proof', category: 'financial', is_mandatory: true, instructions: 'Proof of adequate living finances.' },
      { id: `doc-ins-${countryName.toLowerCase()}`, name: 'Comprehensive Medical & Travel Insurance', category: 'visa', is_mandatory: true, instructions: 'International coverage.' }
    ],
    visa_procedures: {
      visa_type: `National Student Visa for ${countryName}`,
      financial_proof_req: 'Minimum €3,000 - €5,000 equivalent bank solvency statement',
      insurance_req: '€30,000 comprehensive travel and health insurance',
      appointment_channel: `VFS Global / Embassy of ${countryName}`,
      interview_required: true,
      notes: `Complete compliance with ${countryName} immigration requirements.`
    }
  };
}

export function saveCountryWorkflow(workflow: CountryWorkflowConfig): CountryWorkflowConfig {
  const all = getCountryWorkflows();
  const existingIdx = all.findIndex(w => w.id === workflow.id || w.country.toLowerCase() === workflow.country.toLowerCase());

  let updated: CountryWorkflowConfig[];
  if (existingIdx >= 0) {
    updated = all.map((w, idx) => idx === existingIdx ? workflow : w);
  } else {
    updated = [workflow, ...all];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save country workflow locally:', e);
  }

  // Attempt async sync to Supabase system_config
  Promise.resolve(
    supabase.from('system_config').upsert({
      key: `workflow_${workflow.country.toLowerCase()}`,
      value: workflow
    })
  ).catch(() => {});

  window.dispatchEvent(new Event('ferex_country_workflow_change'));
  window.dispatchEvent(new Event('ferex_nawa_change'));
  return workflow;
}

export function deleteCountryWorkflow(id: string): void {
  const all = getCountryWorkflows();
  const filtered = all.filter(w => w.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_country_workflow_change'));
}
