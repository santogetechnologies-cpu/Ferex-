import { useState, useEffect, useCallback } from 'react';
import {
  getPayments, getInvoices, getReceipts, markPaymentPaid,
  createAndCompletePayment, submitPaymentProof as apiSubmitProof,
  verifyPayment as apiVerify, rejectPayment as apiReject
} from '../lib/api/payments';
import { supabase } from '../lib/supabase';
import type { Payment, Invoice, Receipt } from '../lib/types';

export function usePayments(studentId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, inv, rec] = await Promise.all([
        getPayments(studentId),
        getInvoices(studentId),
        getReceipts(studentId),
      ]);

      setPayments(p || []);
      setInvoices(inv || []);
      setReceipts(rec || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAll();

    // Supabase Realtime Subscription on payments
    const channelName = studentId ? `realtime_payments_student_${studentId}` : 'realtime_payments_admin';
    const filterStr = studentId ? `student_id=eq.${studentId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: filterStr,
        },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchAll();
    window.addEventListener('ferex_payment_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_payment_change', handleLocalEvent);
    };
  }, [fetchAll, studentId]);

  const submitProof = async (payload: {
    student_id?: string;
    student_name?: string;
    title: string;
    amount: number;
    payment_type?: string;
    payment_method: string;
    utr_number?: string;
    receipt_url?: string;
  }) => {
    const created = await apiSubmitProof(payload);
    setPayments(prev => [created, ...prev.filter(p => p.id !== created.id)]);
    window.dispatchEvent(new Event('ferex_payment_change'));
    return created;
  };

  const verify = async (id: string, reviewerNotes?: string) => {
    const updated = await apiVerify(id, reviewerNotes);
    setPayments(prev =>
      prev.map(p => (p.id === id ? ({ ...p, ...updated, status: 'Paid' } as Payment) : p))
    );
    window.dispatchEvent(new Event('ferex_payment_change'));
    return updated;
  };

  const reject = async (id: string, reviewerNotes: string) => {
    const updated = await apiReject(id, reviewerNotes);
    setPayments(prev =>
      prev.map(p => (p.id === id ? ({ ...p, ...updated, status: 'Rejected' } as Payment) : p))
    );
    window.dispatchEvent(new Event('ferex_payment_change'));
    return updated;
  };

  const pay = async (id: string, method?: string) => {
    const updated = await markPaymentPaid(id, method);
    setPayments(prev =>
      prev.map(p => (p.id === id ? ({ ...p, ...updated, status: 'Paid' } as Payment) : p))
    );
    window.dispatchEvent(new Event('ferex_payment_change'));
    return updated;
  };

  const processPayment = async (payload: {
    student_id?: string;
    student_name?: string;
    title: string;
    amount: number;
    payment_type?: string;
    payment_method?: string;
  }) => {
    const created = await createAndCompletePayment(payload);
    setPayments(prev => [created, ...prev.filter(p => p.id !== created.id)]);
    window.dispatchEvent(new Event('ferex_payment_change'));
    return created;
  };

  return {
    payments,
    invoices,
    receipts,
    loading,
    error,
    refresh: fetchAll,
    pay,
    processPayment,
    submitProof,
    verify,
    reject,
  };
}
