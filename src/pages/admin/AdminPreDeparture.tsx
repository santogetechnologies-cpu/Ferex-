import React, { useState, useEffect } from 'react';
import { Plane, Search, Edit3, Save, X, Sparkles, UserPlus, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/Card';
import { useStudents } from '../../hooks/useStudents';
import { useApplications } from '../../hooks/useApplications';
import { getVisaRecords } from '../../lib/api/visa';
import { getAllPaymentsAdmin } from '../../lib/api/payments';
import { getPreDepartureRecords, savePreDepartureRecord } from '../../lib/api/preDeparture';
import type { PreDepartureRecord } from '../../lib/api/preDeparture';

export const AdminPreDeparture: React.FC = () => {
  const { students: dbStudents } = useStudents();
  const { applications: dbApps } = useApplications();

  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<PreDepartureRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [toast, setToast] = useState('');
  const [records, setRecords] = useState<PreDepartureRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Eligible students who completed Stage 11
  const [eligibleStudents, setEligibleStudents] = useState<Array<{ id: string; name: string; email: string; university: string }>>([]);
  const [selectedEligibleId, setSelectedEligibleId] = useState<string>('');

  const [newPacket, setNewPacket] = useState({
    airline: 'Lufthansa European Airways',
    flight_no: 'LH-761',
    departure_date: 'Oct 1, 2026',
    arrival_date: 'Oct 2, 2026',
    arrival_city: 'Warsaw Chopin Airport (WAW)',
    dorm_name: 'WUT Residence Hall 4',
    dorm_address: 'ul. Rivoli 14, 00-659 Warsaw, Poland',
    room_no: 'Room 304',
    pickup_driver: 'FEREX Concierge Lead',
    pickup_contact: '+48 22 552 0999',
    pickup_details: 'Driver holding FEREX sign at Terminal 2 Arrivals Exit',
    clearance_status: 'Clearance Granted' as const,
    notes: 'Pre-departure flight packet & campus dorm allotment ready.'
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const dbRecs = await getPreDepartureRecords();

      const visaRecs = await getVisaRecords();
      const visaMap = new Map(visaRecs.map(v => [v.student_id, v]));

      const payments = await getAllPaymentsAdmin();

      // Check which students completed 11 stages
      const eligible: Array<{ id: string; name: string; email: string; university: string }> = [];

      dbStudents.forEach((s) => {
        const app = dbApps.find(a => a.student_id === s.id);
        const visa = visaMap.get(s.id);
        const studentPayments = payments.filter(p => p.student_id === s.id);

        const visaApproved = Boolean(
          visa?.decision_outcome === 'Approved' ||
          String(visa?.status_label).toLowerCase().includes('approved') ||
          (visa?.current_stage && visa.current_stage >= 6) ||
          app?.status === 'Visa Approved' ||
          app?.status === 'Enrolled'
        );

        const inst3Paid = studentPayments.some(p =>
          ((p as any).stage_number === 3 || p.description?.includes('3rd') || p.payment_type?.includes('3rd')) &&
          (p.status === 'Paid' || p.status === 'Verified')
        );

        // Stage 11 completed if Visa Approved AND 3rd Installment Paid (or app status is Enrolled/Visa Approved)
        const stage11Completed = (visaApproved && inst3Paid) || app?.status === 'Enrolled' || app?.status === 'Visa Approved';

        if (stage11Completed) {
          eligible.push({
            id: s.id,
            name: s.full_name || s.email.split('@')[0],
            email: s.email,
            university: app?.university_name || 'Warsaw University of Technology'
          });
        }
      });

      setEligibleStudents(eligible);
      if (eligible.length > 0 && !selectedEligibleId) {
        setSelectedEligibleId(eligible[0].id);
      }

      // Only show students explicitly added to Stage 12
      setRecords(dbRecs);
    } catch (e) {
      console.warn('[AdminPreDeparture load notice]:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener('ferex_pre_departure_change', loadAllData);
    return () => window.removeEventListener('ferex_pre_departure_change', loadAllData);
  }, [dbStudents, dbApps]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSaveUpdate = async (record: PreDepartureRecord) => {
    try {
      const saved = await savePreDepartureRecord(record);
      setRecords(prev => prev.map(r => r.student_id === saved.student_id ? saved : r));
      setSelectedStudent(null);
      showToast(`Pre-departure packet saved for ${record.student_name}!`);
    } catch (err: any) {
      showToast(`Error saving: ${err.message || 'Failed to save'}`);
    }
  };

  const handleAddStudentToStage12 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEligibleId) {
      showToast('Please select an eligible student who has completed Stage 11.');
      return;
    }

    const studentObj = eligibleStudents.find(s => s.id === selectedEligibleId);
    if (!studentObj) return;

    try {
      await savePreDepartureRecord({
        student_id: studentObj.id,
        student_name: studentObj.name,
        student_email: studentObj.email,
        university_name: studentObj.university,
        airline: newPacket.airline,
        flight_no: newPacket.flight_no,
        departure_date: newPacket.departure_date,
        arrival_date: newPacket.arrival_date,
        arrival_city: newPacket.arrival_city,
        dorm_name: newPacket.dorm_name,
        dorm_address: newPacket.dorm_address,
        room_no: newPacket.room_no,
        pickup_driver: newPacket.pickup_driver,
        pickup_contact: newPacket.pickup_contact,
        pickup_details: newPacket.pickup_details,
        clearance_status: newPacket.clearance_status,
        notes: newPacket.notes
      });

      setShowAddModal(false);
      loadAllData();
      showToast(`🎉 ${studentObj.name} enrolled in Stage 12 Pre-Departure!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to add student'}`);
    }
  };

  const filtered = records.filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.student_email && r.student_email.toLowerCase().includes(search.toLowerCase())) ||
    (r.university_name && r.university_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center border border-[#6A1B2E]/20">
              <Plane className="w-5 h-5" />
            </span>
            Post Travel & Campus Housing Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage post-travel flight itineraries, airport concierge pickup drivers, and dormitory housing room key allocations for enrolled students.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-xs flex items-center gap-2 self-start md:self-auto transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Completed Student
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student name, email, or university..."
          className="w-full h-9 bg-transparent border-none text-xs font-semibold text-slate-900 focus:outline-none"
        />
      </div>

      {/* Student List Table */}
      <Card className="p-0 border border-slate-200 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Loading Pre-Departure database records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            <Plane className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-extrabold text-slate-700">No Pre-Departure Students Added</h4>
            <p className="text-slate-400 mt-1 max-w-sm mx-auto">
              Click <span className="text-[#6A1B2E] font-black">+ Add Completed Student</span> above to enroll eligible students into Pre-Departure.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Target University</th>
                  <th className="py-3.5 px-4">Flight / Airline</th>
                  <th className="py-3.5 px-4">Dormitory Housing</th>
                  <th className="py-3.5 px-4">Clearance Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filtered.map((r) => (
                  <tr key={r.student_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 block">{r.student_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.student_email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{r.university_name}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span>{r.flight_no}</span>
                      <span className="block text-[10px] text-slate-400">{r.departure_date}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span>{r.dorm_name}</span>
                      <span className="block text-[10px] font-extrabold text-purple-700">{r.room_no}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${r.clearance_status === 'Clearance Granted' || r.clearance_status === 'Departed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                        {r.clearance_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(r)}
                        className="h-8 px-3 bg-slate-100 hover:bg-[#6A1B2E] hover:text-white border border-slate-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Packet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal 1: Add Stage 11 Completed Student to Stage 12 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 z-10 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#6A1B2E]" /> Enroll Student in Pre-Departure Stage
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Fill in pre-departure departure/arrival dates, accommodation address, and concierge pickup details.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddStudentToStage12} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Select Eligible Student (Stage 11 Completed Only)
                </label>

                {eligibleStudents.length === 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>No students currently have completed all 11 stages (Visa Approval + 3rd Installment).</span>
                  </div>
                ) : (
                  <select
                    value={selectedEligibleId}
                    onChange={(e) => setSelectedEligibleId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    {eligibleStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email}) — {s.university}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {eligibleStudents.length > 0 && (
                <>
                  {/* Flight & Travel Dates */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E] tracking-wider block">✈️ Flight & Travel Schedule</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Airline Carrier</label>
                        <input
                          type="text"
                          value={newPacket.airline}
                          onChange={(e) => setNewPacket({ ...newPacket, airline: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. Lufthansa"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Flight Number</label>
                        <input
                          type="text"
                          value={newPacket.flight_no}
                          onChange={(e) => setNewPacket({ ...newPacket, flight_no: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. LH-761"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Departure Date</label>
                        <input
                          type="text"
                          value={newPacket.departure_date}
                          onChange={(e) => setNewPacket({ ...newPacket, departure_date: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. Oct 1, 2026"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Arrival Date</label>
                        <input
                          type="text"
                          value={newPacket.arrival_date}
                          onChange={(e) => setNewPacket({ ...newPacket, arrival_date: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. Oct 2, 2026"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Destination Airport / City</label>
                      <input
                        type="text"
                        value={newPacket.arrival_city}
                        onChange={(e) => setNewPacket({ ...newPacket, arrival_city: e.target.value })}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                        placeholder="e.g. Warsaw Chopin Airport (WAW)"
                      />
                    </div>
                  </div>

                  {/* Accommodation / Stay Details */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E] tracking-wider block">🏢 Accommodation / Stay Address</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Dorm / Residence Name</label>
                        <input
                          type="text"
                          value={newPacket.dorm_name}
                          onChange={(e) => setNewPacket({ ...newPacket, dorm_name: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. WUT Residence Hall 4"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Room No / Block</label>
                        <input
                          type="text"
                          value={newPacket.room_no}
                          onChange={(e) => setNewPacket({ ...newPacket, room_no: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. Room 304"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Address of Stay</label>
                      <input
                        type="text"
                        value={newPacket.dorm_address}
                        onChange={(e) => setNewPacket({ ...newPacket, dorm_address: e.target.value })}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                        placeholder="e.g. ul. Rivoli 14, 00-659 Warsaw, Poland"
                      />
                    </div>
                  </div>

                  {/* Pickup & Concierge Details */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E] tracking-wider block">🚗 Airport Pickup & Concierge</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Pickup Driver / Lead</label>
                        <input
                          type="text"
                          value={newPacket.pickup_driver}
                          onChange={(e) => setNewPacket({ ...newPacket, pickup_driver: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. FEREX Concierge Lead"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Pickup Contact Phone</label>
                        <input
                          type="text"
                          value={newPacket.pickup_contact}
                          onChange={(e) => setNewPacket({ ...newPacket, pickup_contact: e.target.value })}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                          placeholder="e.g. +48 22 552 0999"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Pickup Location & Instructions</label>
                      <input
                        type="text"
                        value={newPacket.pickup_details}
                        onChange={(e) => setNewPacket({ ...newPacket, pickup_details: e.target.value })}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                        placeholder="e.g. Driver holding FEREX sign at Terminal 2 Arrivals Exit"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                    <button type="submit" className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs flex items-center gap-1">
                      <Save className="w-3.5 h-3.5" /> Save & Enroll Student
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Existing Stage 12 Packet */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setSelectedStudent(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 z-10 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Pre-Departure & Campus Housing Packet — {selectedStudent.student_name}</h3>
                <p className="text-xs font-semibold text-slate-400">{selectedStudent.university_name}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              {/* Flight & Travel Dates */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-[#6A1B2E] tracking-wider block">✈️ Flight & Travel Schedule</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Airline Carrier</label>
                    <input
                      type="text"
                      value={selectedStudent.airline}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, airline: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Flight Number</label>
                    <input
                      type="text"
                      value={selectedStudent.flight_no}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, flight_no: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Departure Date</label>
                    <input
                      type="text"
                      value={selectedStudent.departure_date}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, departure_date: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Arrival Date</label>
                    <input
                      type="text"
                      value={selectedStudent.arrival_date || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, arrival_date: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                      placeholder="e.g. Oct 2, 2026"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Destination Airport / City</label>
                  <input
                    type="text"
                    value={selectedStudent.arrival_city}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, arrival_city: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Accommodation / Stay Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-[#6A1B2E] tracking-wider block">🏢 Accommodation / Stay Address</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Dorm / Residence Name</label>
                    <input
                      type="text"
                      value={selectedStudent.dorm_name}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, dorm_name: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Room No / Block</label>
                    <input
                      type="text"
                      value={selectedStudent.room_no}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, room_no: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Address of Stay</label>
                  <input
                    type="text"
                    value={selectedStudent.dorm_address}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, dorm_address: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    placeholder="e.g. ul. Rivoli 14, 00-659 Warsaw, Poland"
                  />
                </div>
              </div>

              {/* Pickup & Concierge Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-[#6A1B2E] tracking-wider block">🚗 Airport Pickup & Concierge</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Pickup Driver / Lead</label>
                    <input
                      type="text"
                      value={selectedStudent.pickup_driver}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, pickup_driver: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Pickup Contact Phone</label>
                    <input
                      type="text"
                      value={selectedStudent.pickup_contact}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, pickup_contact: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Pickup Location & Instructions</label>
                  <input
                    type="text"
                    value={selectedStudent.pickup_details || ''}
                    onChange={(e) => setSelectedStudent({ ...selectedStudent, pickup_details: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold"
                    placeholder="e.g. Driver holding FEREX sign at Terminal 2 Arrivals Exit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Departure Clearance Status</label>
                <select
                  value={selectedStudent.clearance_status}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, clearance_status: e.target.value as any })}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Clearance Granted">Clearance Granted</option>
                  <option value="Departed">Departed & Arrived at Campus</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button onClick={() => setSelectedStudent(null)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={() => handleSaveUpdate(selectedStudent)} className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> Save Pre-Departure Packet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
