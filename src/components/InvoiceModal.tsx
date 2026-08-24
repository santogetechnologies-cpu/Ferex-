import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Phone, Mail, MapPin, Check } from 'lucide-react';
import ferexLogoImg from '../assets/ferex-logo.png';

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

  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.amount) || 0;
  const taxableValue = Number((totalAmount / 1.18).toFixed(2));
  const cgst = Number(((totalAmount - taxableValue) / 2).toFixed(2));
  const sgst = Number((totalAmount - taxableValue - cgst).toFixed(2));
  const amountWords = numberToWordsINR(totalAmount);

  const formattedDate = invoice.date
    ? new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print / save invoice');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice_${invoice.invoice_no}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Inter:wght@400;500;600;700;800;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #1e293b;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-page {
              width: 210mm;
              min-height: 297mm;
              padding: 12mm 15mm;
              margin: 0 auto;
              box-sizing: border-box;
              background: #ffffff;
              position: relative;
            }
            .maroon-text { color: #50001D; }
            .maroon-bg { background-color: #50001D !important; color: #ffffff !important; }
            .top-bar { height: 3px; background: #50001D; margin: 15px 0 25px 0; }
            .bottom-bar { height: 6px; background: linear-gradient(90deg, #50001D 0%, #80002E 100%); width: 100%; position: absolute; bottom: 0; left: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #50001D !important; color: #ffffff !important; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; }
            td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
            @page { size: A4; margin: 0; }
          </style>
        </head>
        <body>
          <div class="invoice-page">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
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
                FEREX Tax Invoice Viewer
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#50001D] hover:bg-[#6b0027] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto bg-white text-slate-900 select-text" ref={printRef}>
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4">
              {/* Company Logo */}
              <div className="flex items-center gap-3">
                <img src={ferexLogoImg} alt="FEREX VENTURES" className="h-16 w-auto object-contain" />
              </div>

              {/* Company Contact Details */}
              <div className="text-right space-y-1 text-xs font-medium text-slate-700">
                <div className="flex items-center justify-end gap-1.5 text-slate-800 font-semibold">
                  <Phone className="w-3.5 h-3.5 text-[#50001D]" />
                  <span>+91 95448 85077 , +44 78678 67779</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-slate-800 font-semibold">
                  <Mail className="w-3.5 h-3.5 text-[#50001D]" />
                  <span>ferexventuresoffice@gmail.com</span>
                </div>
                <div className="flex items-start justify-end gap-1.5 text-slate-600 text-[11px] max-w-xs ml-auto leading-tight">
                  <MapPin className="w-3.5 h-3.5 text-[#50001D] shrink-0 mt-0.5" />
                  <span>12/640 Thachukuzhi, Companipady Road , Nellikuzhy PO, Kothamangalam, Kerala - 686 691</span>
                </div>
              </div>
            </div>

            {/* Top Maroon Divider */}
            <div className="h-0.5 bg-[#50001D] my-4" />

            {/* TAX INVOICE Title */}
            <div className="text-center my-6 space-y-1">
              <h1 className="text-2xl font-black tracking-wide text-slate-900 font-serif uppercase">
                TAX INVOICE
              </h1>
              <p className="text-xs font-extrabold text-[#50001D] tracking-wider">
                GSTIN: 32AAGCF8602A1Z8
              </p>
            </div>

            <div className="h-[1px] bg-slate-300 my-4" />

            {/* Invoice Details Grid */}
            <div className="grid grid-cols-2 gap-6 my-6 text-left">
              {/* Left Column: Invoice To */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  INVOICE TO
                </p>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  {invoice.student_name}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Student — Ferex Education
                </p>
              </div>

              {/* Right Column: Invoice Details */}
              <div className="space-y-1.5 text-xs text-slate-700">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
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
                  <span className="font-semibold text-slate-500 min-w-[90px]">Place of Supply:</span>
                  <span className="font-bold text-slate-900">{invoice.place_of_supply || 'Kerala'}</span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="my-6 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#50001D] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12 border-r border-[#6d0228]">#</th>
                    <th className="py-3 px-4 border-r border-[#6d0228]">Description</th>
                    <th className="py-3 px-4 text-center w-28 border-r border-[#6d0228]">SAC Code</th>
                    <th className="py-3 px-4 text-right w-36">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  <tr>
                    <td className="py-4 px-4 text-center font-bold text-slate-500">1</td>
                    <td className="py-4 px-4 leading-relaxed font-semibold">
                      {invoice.description || 'Registration Fee – Overseas Education Consultancy Services'}
                      {invoice.course_destination ? ` (${invoice.course_destination})` : ''}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                      {invoice.sac_code || '9992'}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                      {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tax Breakdown & Amount in Words */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 items-end">
              {/* Left: Amount in Words */}
              <div className="text-left space-y-1">
                <p className="text-xs font-semibold text-slate-600">
                  <span className="font-bold text-slate-800">Amount in Words:</span>{' '}
                  <span className="font-bold text-slate-900">{amountWords}</span>
                </p>
              </div>

              {/* Right: Tax Breakdown */}
              <div className="space-y-2 text-xs font-semibold text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value</span>
                  <span className="font-mono font-bold text-slate-800">
                    INR {taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST @ 9%</span>
                  <span className="font-mono font-bold text-slate-800">
                    INR {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-200">
                  <span>SGST @ 9%</span>
                  <span className="font-mono font-bold text-slate-800">
                    INR {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-[#50001D] pt-1">
                  <span>Total Amount</span>
                  <span className="font-mono">
                    INR {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="p-4 bg-[#FAF5F7] border border-[#50001D]/15 rounded-2xl flex items-center justify-between my-6 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    PAID
                  </span>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    Payment Date: {formattedDate}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Payment Mode: {invoice.payment_method || 'Bank Transfer / UPI'}
                    {invoice.utr_number ? ` (UTR: ${invoice.utr_number})` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-8 pb-4 text-[10.5px] italic font-medium text-slate-400">
              This is a computer-generated invoice and does not require a physical signature.
            </div>

            {/* Bottom Maroon Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#50001D] to-[#80002E] rounded-full mt-4" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
