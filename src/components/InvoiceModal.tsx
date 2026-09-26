import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Phone, Mail, MapPin, Check } from 'lucide-react';
import ferexLogoImg from '../assets/ferex-logo.png';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { ToastNotification } from './ToastNotification';

export interface InvoiceData {
  invoice_no: string;
  student_name: string;
  amount: number;
  currency?: string;
  description?: string;
  date?: string;
  payment_method?: string;
  utr_number?: string;
  sac_code?: string;
  place_of_supply?: string;
  course_destination?: string;
  payment_type?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? '-' + a[digit].trim() : '') + ' ';
  };

  let integerPart = Math.floor(num);
  let str = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  const hundred = Math.floor(integerPart / 100);
  integerPart %= 100;

  if (crore) str += inWords(crore) + 'Crore ';
  if (lakh) str += inWords(lakh) + 'Lakh ';
  if (thousand) str += inWords(thousand) + 'Thousand ';
  if (hundred) str += inWords(hundred) + 'Hundred ';
  if (integerPart) {
    if (str !== '') str += 'and ';
    str += inWords(integerPart);
  }

  return (str.trim() || 'Zero') + ' Rupees Only';
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, invoice }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { config } = useFeeConfig();
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.amount) || 0;
  const taxableAmount = Number((totalAmount / 1.18).toFixed(2));
  const cgstAmount = Number(((totalAmount - taxableAmount) / 2).toFixed(2));
  const sgstAmount = Number((totalAmount - taxableAmount - cgstAmount).toFixed(2));
  const totalGstAmount = Number((cgstAmount + sgstAmount).toFixed(2));

  const amountWords = numberToWordsINR(totalAmount);
  const currencySymbol = (invoice.currency || config.advance_registration_fee_currency || 'INR') === 'EUR' ? '€' : ((invoice.currency || config.advance_registration_fee_currency) === 'USD' ? '$' : '₹');
  const currencyCode = invoice.currency || config.advance_registration_fee_currency || 'INR';

  const companyGstin = config.invoice_settings?.company_gstin && config.invoice_settings.company_gstin !== '32AABCF1234F1Z8' 
    ? config.invoice_settings.company_gstin 
    : '32AAGCF8602A1Z8';
  const companyPan = config.invoice_settings?.company_pan && config.invoice_settings.company_pan !== 'AABCF1234F'
    ? config.invoice_settings.company_pan
    : 'AAGCF8602A';
  const companyAddress = config.invoice_settings?.company_address && !config.invoice_settings.company_address.includes('Infopark')
    ? config.invoice_settings.company_address
    : '12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691';
  const sacCode = invoice.sac_code || config.invoice_settings?.sac_code || '9983';
  const placeOfSupply = invoice.place_of_supply || 'Kerala (32)';
  const termsText = config.invoice_settings?.terms_conditions || 'All consulting and onboarding services are billed under Indian GST SAC 9983 (18% GST: CGST 9% + SGST 9%). Governed by FEREX Admission Terms.';

  const formattedDate = invoice.date
    ? new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print or save the invoice PDF');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TAX_INVOICE_${invoice.invoice_no}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      line-height: 1.4;
      font-size: 11.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-card {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #58051E;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #58051E;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
    }
    .brand-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .company-info {
      text-align: right;
      font-size: 10.5px;
      color: #334155;
    }
    .company-info p { margin: 1.5px 0; }
    .title-banner {
      text-align: center;
      margin: 14px 0 10px 0;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 2px;
      margin: 0;
    }
    .gst-tag {
      font-size: 11px;
      font-weight: 800;
      color: #58051E;
      margin-top: 3px;
    }
    .details-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 12px 0;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .info-col h4 {
      margin: 0 0 3px 0;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .info-col p { margin: 1.5px 0; font-size: 11.5px; }
    .info-col strong { color: #0f172a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    th {
      background: #58051E !important;
      color: #ffffff !important;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
    }
    th.text-center { text-align: center; }
    th.text-right { text-align: right; }
    td {
      padding: 10px;
      font-size: 11px;
      border-bottom: 1px solid #e2e8f0;
    }
    td.text-center { text-align: center; }
    td.text-right { text-align: right; }
    .tax-box {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .words-box {
      flex: 1;
      font-size: 11px;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .summary-box {
      width: 270px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      color: #475569;
    }
    .summary-row.total {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 13px;
      font-weight: 900;
      color: #58051E;
    }
    .paid-badge {
      margin-top: 12px;
      padding: 9px 12px;
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .paid-badge strong { color: #166534; font-size: 11.5px; }
    .footer-note {
      text-align: center;
      font-size: 9.5px;
      color: #64748b;
      margin-top: 18px;
      line-height: 1.35;
    }
    .footer-bar {
      height: 4px;
      background: linear-gradient(90deg, #58051E 0%, #80002E 100%);
      margin-top: 8px;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">FEREX</div>
        <div class="brand-sub">European Admissions & Global Operations</div>
      </div>
      <div class="company-info">
        <p><strong>Tel:</strong> +91 95448 85077, +44 78678 67779</p>
        <p><strong>Email:</strong> ferexventuresoffice@gmail.com</p>
        <p>${companyAddress}</p>
        <p><strong>GSTIN:</strong> ${companyGstin} | <strong>PAN:</strong> ${companyPan}</p>
      </div>
    </div>

    <div class="title-banner">
      <h1 class="invoice-title">TAX INVOICE</h1>
      <div class="gst-tag">GSTIN: ${companyGstin} • 18% Total GST (CGST 9% + SGST 9%)</div>
    </div>

    <div class="details-grid">
      <div class="info-col">
        <h4>Billed To (Student Candidate)</h4>
        <p><strong>${invoice.student_name}</strong></p>
        <p>Student — Ferex European Higher Education</p>
        <p>Place of Supply: <strong>${placeOfSupply}</strong></p>
      </div>
      <div class="info-col" style="text-align: right;">
        <h4>Invoice Reference</h4>
        <p><strong>Invoice No:</strong> ${invoice.invoice_no}</p>
        <p><strong>Invoice Date:</strong> ${formattedDate}</p>
        <p><strong>GST SAC Code:</strong> ${sacCode}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 35px;">#</th>
          <th>Service Description</th>
          <th class="text-center" style="width: 70px;">SAC Code</th>
          <th class="text-right" style="width: 95px;">Taxable (${currencyCode})</th>
          <th class="text-right" style="width: 85px;">CGST (9%)</th>
          <th class="text-right" style="width: 85px;">SGST (9%)</th>
          <th class="text-right" style="width: 105px;">Total (${currencyCode})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center">1</td>
          <td>
            <strong>${invoice.description || 'Overseas Higher Education Advisory & Admission Processing Services'}</strong>
            ${invoice.course_destination ? `<br><span style="color:#64748b; font-size:10px;">Destination: ${invoice.course_destination}</span>` : ''}
          </td>
          <td class="text-center font-mono">${sacCode}</td>
          <td class="text-right font-mono">${currencySymbol}${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right font-mono text-emerald-800">${currencySymbol}${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right font-mono text-emerald-800">${currencySymbol}${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right font-bold font-mono">${currencySymbol}${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div class="tax-box">
      <div class="words-box">
        <strong>Amount Chargeable (in words):</strong><br>
        <span style="color: #0f172a; font-weight: bold; line-height: 1.5;">${amountWords}</span>
        <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
          Applicable GST Rate: <strong>18.00%</strong> (Central Tax: 9.00% + State Tax: 9.00%)
        </div>
      </div>
      <div class="summary-box">
        <div class="summary-row">
          <span>Taxable Value (Base)</span>
          <span class="font-mono">${currencySymbol}${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-row">
          <span>Central GST (CGST @ 9%)</span>
          <span class="font-mono">${currencySymbol}${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-row">
          <span>State GST (SGST @ 9%)</span>
          <span class="font-mono">${currencySymbol}${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-row" style="color: #15803d; font-weight: bold;">
          <span>Total GST (18%)</span>
          <span class="font-mono">${currencySymbol}${totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-row total">
          <span>Grand Total (Payment + GST)</span>
          <span>${currencySymbol}${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <div class="paid-badge">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <div>
        <strong>PAYMENT RECEIVED & SETTLED IN FULL</strong><br>
        <span style="font-size: 10.5px; color: #15803d;">Settled via ${invoice.payment_method || 'Online Bank Wire / Payment Gateway'}${invoice.utr_number ? ` • Ref/UTR: ${invoice.utr_number}` : ''} on ${formattedDate}</span>
      </div>
    </div>

    <div class="footer-note">
      ${termsText}<br />
      This is an authentic computer-generated official tax receipt from FEREX. No physical signature is required.
    </div>
    <div class="footer-bar"></div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8"
        >
          {/* Top Modal Controls */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                FEREX Official TAX INVOICE (GSTIN: {companyGstin})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#58051E] hover:bg-[#6b0027] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto bg-white text-slate-900 select-text" ref={printRef}>
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4">
              {/* Company Logo */}
              <div className="flex items-center gap-3">
                <img src={ferexLogoImg} alt="FEREX" className="h-14 w-auto object-contain" />
              </div>

              {/* Company Contact Details */}
              <div className="text-right space-y-1 text-xs font-medium text-slate-700">
                <div className="flex items-center justify-end gap-1.5 text-slate-800 font-semibold">
                  <Phone className="w-3 h-3 text-[#58051E]" />
                  <span>+91 95448 85077, +44 78678 67779</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-slate-800 font-semibold">
                  <Mail className="w-3 h-3 text-[#58051E]" />
                  <span>ferexventuresoffice@gmail.com</span>
                </div>
                <div className="flex items-start justify-end gap-1.5 text-slate-600 text-[11px] max-w-xs ml-auto leading-tight">
                  <MapPin className="w-3 h-3 text-[#58051E] shrink-0 mt-0.5" />
                  <span>{companyAddress}</span>
                </div>
                <div className="text-[11px] text-slate-700 font-bold flex items-center justify-end gap-2 pt-0.5">
                  <span className="text-[#58051E]">GSTIN: {companyGstin}</span>
                  <span>•</span>
                  <span>PAN: {companyPan}</span>
                </div>
              </div>
            </div>

            {/* Top Maroon Divider */}
            <div className="h-0.5 bg-[#58051E] my-3" />

            {/* Title */}
            <div className="text-center my-4 space-y-0.5">
              <h1 className="text-2xl font-black tracking-wide text-slate-900 font-serif uppercase">
                TAX INVOICE
              </h1>
              <p className="text-[11px] font-bold text-[#58051E]">
                GSTIN: {companyGstin} • 18% Total GST (CGST 9% + SGST 9%) • SAC {sacCode}
              </p>
            </div>

            <div className="h-[1px] bg-slate-200 my-3" />

            {/* Invoice Details Grid */}
            <div className="grid grid-cols-2 gap-6 my-4 text-left">
              {/* Left Column: Invoice To */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                  BILLED TO
                </p>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  {invoice.student_name}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Student Candidate — Ferex European Education
                </p>
                <p className="text-[11px] font-medium text-slate-600 mt-1">
                  Place of Supply: <span className="font-bold text-slate-800">{placeOfSupply}</span>
                </p>
              </div>

              {/* Right Column: Invoice Details */}
              <div className="space-y-1 text-xs text-slate-700">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                  INVOICE DETAILS
                </p>
                <div className="flex justify-between sm:justify-start sm:gap-6">
                  <span className="font-semibold text-slate-500 min-w-[90px]">Invoice No:</span>
                  <span className="font-bold text-slate-900 font-mono">{invoice.invoice_no}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-6">
                  <span className="font-semibold text-slate-500 min-w-[90px]">Invoice Date:</span>
                  <span className="font-bold text-slate-900">{formattedDate}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-6">
                  <span className="font-semibold text-slate-500 min-w-[90px]">SAC / HSN:</span>
                  <span className="font-bold text-slate-900 font-mono">{sacCode}</span>
                </div>
              </div>
            </div>

            {/* Itemized Table with CGST 9% and SGST 9% */}
            <div className="my-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#58051E] text-white text-[10px] font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10 border-r border-[#6d0228]">#</th>
                    <th className="py-2.5 px-3 border-r border-[#6d0228]">Service Description</th>
                    <th className="py-2.5 px-3 text-center w-20 border-r border-[#6d0228]">SAC</th>
                    <th className="py-2.5 px-3 text-right w-24 border-r border-[#6d0228]">Taxable ({currencyCode})</th>
                    <th className="py-2.5 px-3 text-right w-20 border-r border-[#6d0228]">CGST (9%)</th>
                    <th className="py-2.5 px-3 text-right w-20 border-r border-[#6d0228]">SGST (9%)</th>
                    <th className="py-2.5 px-3 text-right w-24">Total ({currencyCode})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  <tr>
                    <td className="py-3 px-3 text-center font-bold text-slate-500">1</td>
                    <td className="py-3 px-3 leading-relaxed font-semibold">
                      {invoice.description || 'Overseas Education Advisory & Application Lodging Services'}
                      {invoice.course_destination ? ` (${invoice.course_destination})` : ''}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{sacCode}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {currencySymbol}{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">
                      {currencySymbol}{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">
                      {currencySymbol}{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                      {currencySymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount Breakdown & In Words */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 items-start">
              {/* Left: Amount in Words */}
              <div className="text-left space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-600">
                  <span className="font-bold text-slate-800 block text-[10.5px] uppercase tracking-wider text-slate-400">
                    Amount Chargeable (in words):
                  </span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">{amountWords}</span>
                </p>
                <div className="pt-2 border-t border-slate-200/70 text-[10.5px] text-slate-500">
                  Tax Summary: <strong>18% Total GST</strong> (Central Tax 9% + State Tax 9%) • GSTIN: <strong>{companyGstin}</strong>
                </div>
              </div>

              {/* Right: Summary */}
              <div className="space-y-1.5 text-xs font-semibold text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base Value:</span>
                  <span className="font-mono">{currencySymbol}{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Central GST (CGST @ 9%):</span>
                  <span className="font-mono text-emerald-700">+{currencySymbol}{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>State GST (SGST @ 9%):</span>
                  <span className="font-mono text-emerald-700">+{currencySymbol}{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold border-t border-slate-200/80 pt-1">
                  <span>Total GST Amount (18%):</span>
                  <span className="font-mono">{currencySymbol}{totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#58051E] pt-1.5 border-t border-slate-300">
                  <span>Grand Total Paid:</span>
                  <span className="font-mono">
                    {currencySymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="p-3.5 bg-[#FAF5F7] border border-[#58051E]/15 rounded-2xl flex items-center justify-between my-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    PAID & CLEARED IN FULL
                  </span>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    Payment Date: {formattedDate} • Mode: {invoice.payment_method || 'Direct Bank Transfer / Online Gateway'}
                    {invoice.utr_number ? ` (UTR: ${invoice.utr_number})` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-4 pb-2 text-[10px] italic font-medium text-slate-400">
              {termsText}<br />
              This is an authentic computer-generated official tax invoice from FEREX. No physical signature is required.
            </div>

            {/* Bottom Maroon Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#58051E] to-[#80002E] rounded-full mt-2" />
          </div>
        </motion.div>
      </div>
      <ToastNotification message={toast} onClose={() => setToast('')} />
    </AnimatePresence>
  );
};
