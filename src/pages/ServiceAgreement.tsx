import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ShieldCheck, CheckCircle2, AlertCircle, Download,
  Printer, PenTool, Check, Building2, Phone, Mail, MapPin, Clock, ArrowRight, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeeConfig } from '../hooks/useFeeConfig';
import {
  fetchStudentAgreement,
  saveStudentAgreement,
  isAgreementSigned,
  COMPANY_OFFICIAL_DETAILS,
  type ServiceAgreementData,
} from '../lib/api/agreement';

export const ServiceAgreement: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { config: feeConfig } = useFeeConfig();

  const studentId = user?.id || profile?.id || '';
  const studentEmail = profile?.email || user?.email || '';
  const studentNameFromProfile = profile?.full_name || user?.email?.split('@')[0] || '';

  const [studentName, setStudentName] = useState(studentNameFromProfile);
  const [agreement, setAgreement] = useState<ServiceAgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('typed');
  const [typedSignature, setTypedSignature] = useState(studentNameFromProfile);
  const [agreeAll, setAgreeAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Drawing Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (studentNameFromProfile && !studentName) {
      setStudentName(studentNameFromProfile);
      setTypedSignature(studentNameFromProfile);
    }
  }, [studentNameFromProfile]);

  useEffect(() => {
    if (studentId) {
      fetchStudentAgreement(studentId, studentEmail).then((res) => {
        setAgreement(res);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [studentId, studentEmail]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#570229';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const regAmount = feeConfig.advance_registration_fee_amount || 1500;
  const docVisaAmount = feeConfig.visa_documents_fee_amount || 15000;
  const serviceAmount = feeConfig.service_charge_amount || feeConfig.agency_fee_amount || 25000;

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert('Please enter your full legal student name.');
      return;
    }
    if (!agreeAll) {
      alert('Please accept and agree to all clauses and terms of the service agreement.');
      return;
    }

    let signatureData = '';
    if (signatureType === 'drawn') {
      if (!hasDrawn || !canvasRef.current) {
        alert('Please draw your digital signature on the canvas.');
        return;
      }
      signatureData = canvasRef.current.toDataURL('image/png');
    } else {
      if (!typedSignature.trim()) {
        alert('Please type your legal signature name.');
        return;
      }
      signatureData = typedSignature.trim();
    }

    setIsSubmitting(true);

    const agreementRecord: ServiceAgreementData = {
      id: `agr_${Date.now()}`,
      student_id: studentId,
      student_name: studentName.trim(),
      student_email: studentEmail,
      company_address: COMPANY_OFFICIAL_DETAILS.address,
      contact_numbers: COMPANY_OFFICIAL_DETAILS.phones,
      official_email: COMPANY_OFFICIAL_DETAILS.email,
      signature_data: signatureData,
      signature_type: signatureType,
      signed_at: new Date().toISOString(),
      registration_fee: regAmount,
      application_fee: docVisaAmount,
      visa_fee: serviceAmount,
      currency: 'INR',
      status: 'Signed',
      version: '2026.1',
    };

    const saved = await saveStudentAgreement(agreementRecord);
    setAgreement(saved);
    setIsSubmitting(false);
    setSuccessToast(true);

    setTimeout(() => {
      setSuccessToast(false);
      // Auto navigate to advanced registration or dashboard
      navigate('/student/payments');
    }, 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const isSigned = Boolean(agreement && agreement.status === 'Signed');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#570229] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 text-left">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Service Agreement signed and securely registered! Redirecting to Fee Stage...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#570229] bg-[#570229]/10 px-2.5 py-0.5 rounded-md">
              Legal Compliance
            </span>
            {isSigned ? (
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <Check className="w-3 h-3" /> Signed & Verified
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" /> Signature Required
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Student Service Agreement
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Stage 2 in your journey: Executed after Lead Inquiry & before Advanced Registration Fee.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSigned && (
            <button
              onClick={handlePrint}
              type="button"
              className="h-9 px-3.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          )}
          {isSigned && (
            <button
              onClick={() => navigate('/student/payments')}
              type="button"
              className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-[#570229] hover:bg-[#6F0335] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              Proceed to Payments <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Official Agreement Document Sheet */}
      <div className="bg-white rounded-2xl border border-slate-300/90 shadow-md p-6 sm:p-10 space-y-8 print:shadow-none print:border-none print:p-0">
        {/* Header / Company Info */}
        <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[11px] font-black tracking-widest text-[#570229] uppercase block mb-1">
              FEREX EDUCATION
            </span>
            <span className="text-xs font-semibold text-slate-500 block">
              (Under Ferex Ventures Private Limited)
            </span>
            <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2 max-w-md">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 md:text-right">
            <div className="flex items-center md:justify-end gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">+91 95448 85077 , +44 78678 67779</span>
            </div>
            <div className="flex items-center md:justify-end gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">ferexventuresoffice@gmail.com</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              GSTIN: 32AAGCF8602A1Z8 | PAN: AAGCF8602A
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center py-2 border-b border-slate-100">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase font-serif">
            SERVICE AGREEMENT
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Standard Terms of Education Consultancy, University Placement & Visa Processing
          </p>
        </div>

        {/* Clauses List */}
        <div className="space-y-5 text-xs text-slate-700 leading-relaxed font-sans">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">1. PARTIES</h3>
            <p className="text-slate-600">
              This agreement is made between <strong>Ferex Education</strong> (under Ferex Ventures Private Limited)
              and the student mentioned below (the &ldquo;Student&rdquo;).
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">2. SCOPE OF SERVICES</h3>
            <p className="text-slate-600">
              Ferex Education will provide admission guidance, university application processing, visa assistance,
              and pre-departure guidance. Post-arrival services are optional and may be charged separately.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">3. FEE &amp; PAYMENT STRUCTURE</h3>
            <p className="text-slate-600">
              All service fees are strictly non-refundable. Payments must be made in agreed stages. Delay in payment
              may affect timelines.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">5. UNIVERSITY ADMISSION DISCLAIMER</h3>
            <p className="text-slate-600">
              Admission decisions are solely made by the respective universities. Ferex Education acts only as a facilitator.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">6. VISA DISCLAIMER</h3>
            <p className="text-slate-600">
              Visa approval or rejection is entirely at the discretion of the embassy/consulate. No guarantees are provided.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">7. STUDENT RESPONSIBILITIES</h3>
            <p className="text-slate-600">
              The student must provide genuine documents, accurate information, and follow all timelines.
              Any false information may result in immediate termination of services.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">8. FINANCIAL RESPONSIBILITY</h3>
            <p className="text-slate-600">
              The student is solely responsible for university tuition fees, living expenses, visa consular charges,
              and any third-party payments.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 text-[11px] tracking-wide">
            FEEDRUCATIEON X (Under Ferex Ventures Private Limited)
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">9. REFUND POLICY</h3>
            <p className="text-slate-600">
              No refunds will be issued once the service process has begun under any circumstances.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">10. CONFIDENTIALITY</h3>
            <p className="text-slate-600">
              All student data will be kept strictly confidential and used only for academic admission and visa processing purposes.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">11. TERMINATION</h3>
            <p className="text-slate-600">
              Ferex Education reserves the right to terminate services due to misconduct, non-payment, or submission of false documents.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">12. JURISDICTION</h3>
            <p className="text-slate-600">
              This agreement shall be governed by and interpreted under the laws of India, subject to the jurisdiction of courts in Kerala.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">13. DECLARATION</h3>
            <p className="text-slate-600">
              By signing below, the student agrees to all terms and conditions stated above in full knowledge and consent.
            </p>
          </div>
        </div>

        {/* STAGE DESCRIPTION AMOUNT (INR) Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
            Fee &amp; Milestone Schedule
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 px-4 font-bold">1</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">Registration Fee</span>
                    <span className="text-[11px] text-slate-500">Initial intake eligibility, profile vetting &amp; portal onboarding</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                    ₹{regAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold">2</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">Application Processing &amp; Visa Documents</span>
                    <span className="text-[11px] text-slate-500">University application lodging, translations &amp; visa document compilation (Due after offer letter)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                    ₹{docVisaAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold">3</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">Visa Processing &amp; Service Charge</span>
                    <span className="text-[11px] text-slate-500">Consular submission advisory, appointment handling &amp; pre-departure clearance (Due after visa)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                    ₹{serviceAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10.5px] text-slate-500 italic">
            * Note: University Application Fee, University Tuition Fee, and VFS Embassy Appointment Charges are paid by the student directly to the respective institutions / authorities — not to Ferex Education.
          </p>
        </div>

        {/* Signature Verification Block */}
        <div className="pt-6 border-t border-slate-200">
          {isSigned ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 text-sm font-black">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>Officially Executed &amp; Legally Binding Agreement</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Student Details</span>
                  <p className="text-sm font-extrabold text-slate-900">{agreement?.student_name}</p>
                  <p className="text-xs text-slate-500">{agreement?.student_email}</p>
                  <p className="text-[11px] text-slate-400">
                    Signed Date: {agreement?.signed_at ? new Date(agreement.signed_at).toLocaleString() : 'N/A'}
                  </p>
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Student Signature</span>
                    {agreement?.signature_type === 'drawn' ? (
                      <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-xs">
                        <img src={agreement.signature_data} alt="Student Signature" className="h-12 object-contain" />
                      </div>
                    ) : (
                      <div className="font-serif italic text-lg text-[#570229] border-b border-slate-300 pb-1 inline-block">
                        {agreement?.signature_data}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 sm:text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Authorized Signatory</span>
                  <p className="text-sm font-extrabold text-slate-900">Ferex Education</p>
                  <p className="text-xs text-slate-500">Under Ferex Ventures Pvt Ltd</p>
                  <p className="text-[11px] text-slate-400">Official Verification ID: {agreement?.id}</p>
                  <div className="pt-2 flex sm:justify-end">
                    <div className="border border-emerald-300 bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 text-emerald-700 text-xs font-bold shadow-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Ferex Verified Signatory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Signing Form */
            <form onSubmit={handleSignAgreement} className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#570229]" />
                  <span>Student Declaration &amp; Electronic Signature</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Legal Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Date *
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      className="w-full h-11 px-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Signature Type Switch */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-slate-700">Signature Method:</span>
                    <button
                      type="button"
                      onClick={() => setSignatureType('typed')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                        signatureType === 'typed'
                          ? 'bg-[#570229] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      Type Name
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureType('drawn')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                        signatureType === 'drawn'
                          ? 'bg-[#570229] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      Draw Signature
                    </button>
                  </div>

                  {signatureType === 'typed' ? (
                    <div>
                      <input
                        type="text"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Type signature"
                        className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-lg font-serif italic text-[#570229] focus:outline-none focus:border-[#570229]"
                      />
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Your typed legal name constitutes an electronic signature under the Information Technology Act.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="border border-slate-300 rounded-xl bg-white overflow-hidden relative">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-[120px] cursor-crosshair block touch-none"
                        />
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="absolute top-2 right-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Draw your signature above using your mouse or touch screen.
                      </p>
                    </div>
                  )}
                </div>

                {/* Consent Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeAll}
                      onChange={(e) => setAgreeAll(e.target.checked)}
                      className="mt-0.5 rounded text-[#570229] focus:ring-[#570229]"
                    />
                    <span className="text-xs text-slate-700 font-medium leading-snug">
                      I have carefully read, understood, and unequivocally agree to all 13 clauses and fee structures
                      of this Ferex Education Service Agreement. I acknowledge that all payments are non-refundable once work begins.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !agreeAll}
                  className="h-11 px-6 rounded-xl text-xs font-bold text-white bg-[#570229] hover:bg-[#6F0335] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registering Legal Signature...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sign &amp; Agree to Terms</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
