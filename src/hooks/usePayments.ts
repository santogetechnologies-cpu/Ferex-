import { useState, useEffect, useCallback } from 'react';
import {
  getPayments, getInvoices, getReceipts, markPaymentPaid,
  createAndCompletePayment, submitPaymentProof as apiSubmitProof,
  verifyPayment as apiVerify, rejectPayment as apiReject
} from '../lib/api/payments';
import type { Payment, Invoice, Receipt } from '../lib/types';

export function usePayments(studentId?: string) {
  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_student_payments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_student_invoices');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_student_receipts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('ferex_student_payments');
      return saved ? false : true;
    } catch (e) {
      return true;
    }
  });
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
      localStorage.setItem('ferex_student_payments', JSON.stringify(p || []));
      setInvoices(inv || []);
      localStorage.setItem('ferex_student_invoices', JSON.stringify(inv || []));
      setReceipts(rec || []);
      localStorage.setItem('ferex_student_receipts', JSON.stringify(rec || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAll();

    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ferex_student_payments');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setPayments(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ferex_payment_change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ferex_payment_change', handleStorageChange);
    };
  }, [fetchAll]);

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
    setPayments(prev => {
      const nextList = [created, ...prev.filter(p => p.id !== created.id)];
      localStorage.setItem('ferex_student_payments', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_payment_change'));
      return nextList;
    });
    return created;
  };

  const verify = async (id: string, reviewerNotes?: string) => {
    const updated = await apiVerify(id, reviewerNotes);
    setPayments(prev => {
      const nextList = prev.map(p => p.id === id ? { ...p, ...updated, status: 'Paid' } as Payment : p);
      localStorage.setItem('ferex_student_payments', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_payment_change'));
      return nextList;
    });
    return updated;
  };

  const reject = async (id: string, reviewerNotes: string) => {
    const updated = await apiReject(id, reviewerNotes);
    setPayments(prev => {
      const nextList = prev.map(p => p.id === id ? { ...p, ...updated, status: 'Rejected' } as Payment : p);
      localStorage.setItem('ferex_student_payments', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_payment_change'));
      return nextList;
    });
    return updated;
  };

  const pay = async (id: string, method?: string) => {
    const updated = await markPaymentPaid(id, method);
    setPayments(prev => {
      const nextList = prev.map(p => p.id === id ? { ...p, ...updated, status: 'Paid' } as Payment : p);
      localStorage.setItem('ferex_student_payments', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_payment_change'));
      return nextList;
    });
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
    setPayments(prev => {
      const nextList = [created, ...prev.filter(p => p.id !== created.id)];
      localStorage.setItem('ferex_student_payments', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_payment_change'));
      return nextList;
    });
    return created;
  };

  return {
    payments, invoices, receipts, loading, error,
    refresh: fetchAll, pay, processPayment, submitProof, verify, reject
  };
}
