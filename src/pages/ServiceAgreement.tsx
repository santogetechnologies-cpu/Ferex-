import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ShieldCheck, CheckCircle2, AlertCircle, Download,
  Printer, PenTool, Check, Building2, Phone, Mail, MapPin, Clock, ArrowRight, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveStudentScope } from '../hooks/useActiveStudentScope';
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
  const { activeStudentId, activeStudentEmail, activeStudentName } = useActiveStudentScope();
  const { config: feeConfig } = useFeeConfig();

  const studentId = activeStudentId;
  const studentEmail = activeStudentEmail;
  const studentNameFromProfile = activeStudentName;

  const [studentName, setStudentName] = useState(studentNameFromProfile);
  const [agreement, setAgreement] = useState<ServiceAgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('typed');
  const [typedSignature, setTypedSignature] = useState(studentNameFromProfile);
  const [agreeAll, setAgreeAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

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
      }).catch(error => { setLoadError(error.message); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [studentId, studentEmail]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#570229';
  };

  useEffect(() => {
    if (signatureType === 'drawn') {
      const anim = requestAnimationFrame(() => {
        initCanvas();
      });
      return () => cancelAnimationFrame(anim);
    }
  }, [signatureType]);

  useEffect(() => {
    if (signatureType !== 'drawn') return;
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const prevData = hasDrawn ? canvas.toDataURL() : null;
      initCanvas();
      if (prevData) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const rect = canvas.getBoundingClientRect();
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
          }
        };
        img.src = prevData;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [signatureType, hasDrawn]);

  // Pointer Events drawing handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fillStyle = '#570229';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native?.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [e];
    for (const ev of events) {
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (e && canvasRef.current) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    initCanvas();
    setHasDrawn(false);
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    try {
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      return !pixelBuffer.some((color) => color !== 0);
    } catch {
      return !hasDrawn;
    }
  };

  const regAmount = feeConfig.advance_registration_fee_enabled ? (feeConfig.advance_registration_fee_amount ?? 0) : 0;
  const docVisaAmount = feeConfig.visa_documents_fee_enabled ? (feeConfig.visa_documents_fee_amount ?? 0) : 0;
  const serviceAmount = feeConfig.separate_agency_fee_enabled ? (feeConfig.agency_fee_amount ?? 0) : 0;

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!studentName.trim()) {
      setFormError('Please enter your full legal student name.');
      return;
    }
    if (!agreeAll) {
      setFormError('Please accept and agree to all clauses and terms of the service agreement.');
      return;
    }

    let signatureData = '';
    if (signatureType === 'drawn') {
      const canvas = canvasRef.current;
      if (!hasDrawn || !canvas || isCanvasBlank(canvas)) {
        setFormError('Please draw your digital signature on the canvas.');
        return;
      }
      signatureData = canvas.toDataURL('image/png');
    } else {
      if (!typedSignature.trim()) {
        setFormError('Please type your legal signature name.');
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
      currency: feeConfig.education_fees?.[0]?.currency || 'INR',
      status: 'Signed',
      version: '2026.1',
    };

    try {
    const saved = await saveStudentAgreement(agreementRecord);
    setAgreement(saved);
    try {
      const { getJourneyStages, updateJourneyStageStatus } = await import('../lib/api/journey');
      const stages = await getJourneyStages(studentId);
      const s2 = stages.find(s => s.stage_number === 2);
      if (s2 && s2.status !== 'Completed') {
        await updateJourneyStageStatus(s2.id, 'Completed', '13-Clause Service Agreement digitally executed by student.');
      }
    } catch (stageErr) {
      console.warn('Auto-advance Stage 2 notice:', stageErr);
    }
    setIsSubmitting(false);
    setSuccessToast(true);

    setTimeout(() => {
      setSuccessToast(false);
      // Auto navigate to advanced registration or dashboard
      navigate('/student/payments');
    }, 2500);
    } catch (error) { setLoadError(`Agreement was not saved: ${(error as Error).message}`); }
    finally { setIsSubmitting(false); }
  };

  useEffect(() => {
    let cachedTitle = '';
    const handleBeforePrint = () => {
      cachedTitle = document.title;
      document.title = '';
    };
    const handleAfterPrint = () => {
      document.title = cachedTitle || 'FEREX — Global Education & Corporate Ecosystem';
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = '';
    window.print();
    setTimeout(() => {
      if (!document.title) {
        document.title = originalTitle || 'FEREX — Global Education & Corporate Ecosystem';
      }
    }, 1000);
  };

  const isSigned = Boolean(agreement && agreement.status === 'Signed');

  if (loadError) return <div role="alert" className="p-4 bg-red-50 text-red-800">{loadError} <button className="underline" onClick={() => window.location.reload()}>Retry</button></div>;

  if (loading) {
  return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#570229] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 text-left print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-0 print:pb-0 print:h-auto print:min-h-0 print:overflow-visible print:block">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm print:hidden"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Service Agreement signed and securely registered! Redirecting to Fee Stage...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
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
            Service agreement
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
      <div
        id="student-service-agreement"
        className="student-service-agreement-sheet bg-white rounded-2xl border border-slate-300/90 shadow-md p-6 sm:p-10 space-y-8 print:shadow-none print:border-none print:p-0 print:m-0 print:space-y-6 print:rounded-none print:h-auto print:min-h-0 print:overflow-visible print:block"
      >
        {/* Header / Company Info (Screen UI only - in print, moved to bottom of final page) */}
        <div className="agreement-print-header border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <span className="text-[11px] font-black tracking-widest text-[#570229] uppercase block mb-1">
              FEREX EDUCATION
            </span>
            <span className="text-xs font-semibold text-slate-500 block">
              (Under Ferex Ventures Private Limited)
            </span>
            <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2 max-w-md">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 print:text-[#570229]" />
              <span>12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 md:text-right print:text-right">
            <div className="flex items-center md:justify-end gap-1.5 print:justify-end">
              <Phone className="w-3.5 h-3.5 text-slate-400 print:text-[#570229]" />
              <span className="font-medium">+91 95448 85077 , +44 78678 67779</span>
            </div>
            <div className="flex items-center md:justify-end gap-1.5 print:justify-end">
              <Mail className="w-3.5 h-3.5 text-slate-400 print:text-[#570229]" />
              <span className="font-medium">ferexventuresoffice@gmail.com</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              GSTIN: 32AAGCF8602A1Z8 | PAN: AAGCF8602A
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="agreement-print-title text-center py-2 border-b border-slate-100 print:py-1.5 print:border-b print:border-slate-300 print:mb-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase font-serif print:text-xl">
            SERVICE AGREEMENT
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1 print:text-[11px] print:text-slate-600">
            Standard Terms of Education Consultancy, University Placement & Visa Processing
          </p>
        </div>

        {/* Clauses List */}
        <div className="space-y-5 text-xs text-slate-700 leading-relaxed font-sans print:space-y-1.5">
          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">1. PARTIES</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              This agreement is made between <strong>Ferex Education</strong> (under Ferex Ventures Private Limited)
              and the student mentioned below (the &ldquo;Student&rdquo;).
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">2. SCOPE OF SERVICES</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              Ferex Education will provide admission guidance, university application processing, visa assistance,
              and pre-departure guidance. Post-arrival services are optional and may be charged separately.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">3. FEE &amp; PAYMENT STRUCTURE</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              All service fees are strictly non-refundable. Payments must be made in agreed stages. Delay in payment
              may affect timelines.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">5. UNIVERSITY ADMISSION DISCLAIMER</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              Admission decisions are solely made by the respective universities. Ferex Education acts only as a facilitator.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">6. VISA DISCLAIMER</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              Visa approval or rejection is entirely at the discretion of the embassy/consulate. No guarantees are provided.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">7. STUDENT RESPONSIBILITIES</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              The student must provide genuine documents, accurate information, and follow all timelines.
              Any false information may result in immediate termination of services.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">8. FINANCIAL RESPONSIBILITY</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              The student is solely responsible for university tuition fees, living expenses, visa consular charges,
              and any third-party payments.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 text-[11px] tracking-wide agreement-clause print:break-inside-avoid print:bg-slate-50 print:border-slate-300">
            FEEDRUCATIEON X (Under Ferex Ventures Private Limited)
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">9. REFUND POLICY</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              No refunds will be issued once the service process has begun under any circumstances.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">10. CONFIDENTIALITY</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              All student data will be kept strictly confidential and used only for academic admission and visa processing purposes.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">11. TERMINATION</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              Ferex Education reserves the right to terminate services due to misconduct, non-payment, or submission of false documents.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">12. JURISDICTION</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              This agreement shall be governed by and interpreted under the laws of India, subject to the jurisdiction of courts in Kerala.
            </p>
          </div>

          <div className="space-y-1 agreement-clause print:break-inside-avoid">
            <h3 className="font-extrabold text-slate-900 text-sm print:text-xs">13. DECLARATION</h3>
            <p className="text-slate-600 print:text-[11px] print:text-slate-700">
              By signing below, the student agrees to all terms and conditions stated above in full knowledge and consent.
            </p>
          </div>
        </div>

        {/* STAGE DESCRIPTION AMOUNT (INR) Table - Positioned on Page 1 directly after Section 13 */}
        <div className="space-y-2 agreement-fee-table print:break-inside-avoid print:mt-3 print:space-y-1.5">
          <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider print:text-[11px]">
            Fee &amp; Milestone Schedule
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden print:rounded-none print:border-none">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider print:bg-slate-100">
                <tr>
                  <th className="py-2.5 px-4 print:py-1.5 print:px-3 text-center print:text-center w-12">Stage</th>
                  <th className="py-2.5 px-4 print:py-1.5 print:px-3 text-left print:text-left">Description</th>
                  <th className="py-2.5 px-4 text-right print:py-1.5 print:px-3">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-slate-200">
                <tr>
                  <td className="py-3 px-4 font-bold print:py-1.5 print:px-3 text-center print:text-center">1</td>
                  <td className="py-3 px-4 print:py-1.5 print:px-3">
                    <span className="font-bold text-slate-900 block print:text-[11px]">Registration Fee</span>
                    <span className="text-[11px] text-slate-500 print:text-[10px]">Initial intake eligibility, profile vetting &amp; portal onboarding</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900 print:py-1.5 print:px-3 print:text-[11px]">
                    ₹{regAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold print:py-1.5 print:px-3 text-center print:text-center">2</td>
                  <td className="py-3 px-4 print:py-1.5 print:px-3">
                    <span className="font-bold text-slate-900 block print:text-[11px]">Application Processing &amp; Visa Documents</span>
                    <span className="text-[11px] text-slate-500 print:text-[10px]">University application lodging, translations &amp; visa document compilation (Due after offer letter)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900 print:py-1.5 print:px-3 print:text-[11px]">
                    ₹{docVisaAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold print:py-1.5 print:px-3 text-center print:text-center">3</td>
                  <td className="py-3 px-4 print:py-1.5 print:px-3">
                    <span className="font-bold text-slate-900 block print:text-[11px]">Visa Processing &amp; Service Charge</span>
                    <span className="text-[11px] text-slate-500 print:text-[10px]">Consular submission advisory, appointment handling &amp; pre-departure clearance (Due after visa)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black font-mono text-slate-900 print:py-1.5 print:px-3 print:text-[11px]">
                    ₹{serviceAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10.5px] text-slate-500 italic print:text-[9.5px] print:leading-snug">
            * Note: University Application Fee, University Tuition Fee, and VFS Embassy Appointment Charges are paid by the student directly to the respective institutions / authorities — not to Ferex Education.
          </p>
        </div>

        {/* Page 2 Wrapper: Officially Executed Agreement + Bottom Company Details / Footer */}
        <div className="agreement-page-2-wrapper pt-6">
          {/* Signature Verification Block */}
          <div className="agreement-signature-block print:break-inside-avoid print:pt-0 print:border-none">
            {isSigned ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4 print:p-4 print:bg-emerald-50/50 print:border print:border-emerald-300 print:rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-black">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span>Officially Executed &amp; Legally Binding Agreement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 print:grid-cols-2 print:gap-6">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Student Details</span>
                    <p className="text-sm font-extrabold text-slate-900">{agreement?.student_name}</p>
                    <p className="text-xs text-slate-500">{agreement?.student_email}</p>
                    <p className="text-[11px] text-slate-400 print:text-slate-500">
                      Signed Date: {agreement?.signed_at ? new Date(agreement.signed_at).toLocaleString() : 'N/A'}
                    </p>
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Student Signature</span>
                      {agreement?.signature_type === 'drawn' ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-xs print:border-slate-300">
                          <img src={agreement.signature_data} alt="Student Signature" className="h-12 object-contain" />
                        </div>
                      ) : (
                        <div className="font-serif italic text-lg text-[#570229] border-b border-slate-300 pb-1 inline-block">
                          {agreement?.signature_data}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 sm:text-right print:text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Authorized Signatory</span>
                    <p className="text-sm font-extrabold text-slate-900">Ferex Education</p>
                    <p className="text-xs text-slate-500">Under Ferex Ventures Pvt Ltd</p>
                    <p className="text-[11px] text-slate-400 print:text-slate-500">Official Verification ID: {agreement?.id}</p>
                    <div className="pt-2 flex flex-col sm:items-end print:items-end">
                      <span className="text-[10px] font-bold uppercase block mb-1 invisible select-none" aria-hidden="true">&nbsp;</span>
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
              <form onSubmit={handleSignAgreement} className="space-y-6 print:hidden">
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
                            onPointerDown={startDrawing}
                            onPointerMove={draw}
                            onPointerUp={stopDrawing}
                            onPointerCancel={stopDrawing}
                            style={{ touchAction: 'none' }}
                            className="w-full h-[120px] cursor-crosshair block select-none touch-none"
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

                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

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

          {/* Bottom Unit on Final Page: Company Details + Document Footer */}
          <div className="agreement-final-page-footer hidden print:block pt-6 print:pt-0">
            {/* FEREX Education Company Details */}
            <div className="agreement-print-company-footer border-t border-slate-200 pt-4 mt-6 print:pt-3 print:mt-4 print:border-t-[1.5pt] print:border-slate-300 flex justify-between items-start text-left print:break-inside-avoid">
              <div className="space-y-1">
                <span className="text-[11px] font-black tracking-widest text-[#570229] uppercase block mb-1">
                  FEREX EDUCATION
                </span>
                <span className="text-xs font-semibold text-slate-500 block">
                  (Under Ferex Ventures Private Limited)
                </span>
                <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2 max-w-md">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 print:text-[#570229]" />
                  <span>12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 text-right print:text-right">
                <div className="flex items-center justify-end gap-1.5 print:justify-end">
                  <Phone className="w-3.5 h-3.5 text-slate-400 print:text-[#570229]" />
                  <span className="font-medium">+91 95448 85077 , +44 78678 67779</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 print:justify-end">
                  <Mail className="w-3.5 h-3.5 text-slate-400 print:text-[#570229]" />
                  <span className="font-medium">ferexventuresoffice@gmail.com</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  GSTIN: 32AAGCF8602A1Z8 | PAN: AAGCF8602A
                </div>
              </div>
            </div>

            {/* Document Print Footer */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-200 pt-3 mt-4 print:pt-2 print:mt-3 print:border-t print:border-slate-300 print:break-inside-avoid">
              <span>FEREX EDUCATION • Student Service Agreement</span>
              <span>Official Legal Compliance Document</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
