import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Home, MapPin, Phone, Mail, Building, Plane, Calendar,
  CheckCircle2, Clock, AlertCircle, ExternalLink, Upload,
  User, Bed, Wifi, Utensils, Bus, Shield
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';

interface HousingRecord {
  id: string;
  student_id: string;
  student_name: string;
  university_name: string;
  housing_type: 'University Dorm' | 'Private Apartment' | 'Homestay' | 'Shared Flat' | 'Not Assigned';
  accommodation_name: string;
  address: string;
  city: string;
  postal_code: string;
  move_in_date: string;
  contract_duration: string;
  monthly_rent: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  amenities: string[];
  status: 'Pending' | 'Confirmed' | 'Checked In';
  notes: string;
  documents_url?: string;
}

interface TravelRecord {
  id: string;
  student_id: string;
  flight_number: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  arrival_date: string;
  ticket_status: 'Not Booked' | 'Booked' | 'Confirmed';
  pickup_required: boolean;
  pickup_confirmed: boolean;
  notes: string;
}

export const PostTravelHousing: React.FC = () => {
  const { user, profile } = useAuth();
  const { applications } = useApplications(user?.id);

  const [activeTab, setActiveTab] = useState<'housing' | 'travel' | 'checklist'>('housing');
  const [housingRecord, setHousingRecord] = useState<HousingRecord | null>(null);
  const [travelRecord, setTravelRecord] = useState<TravelRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const targetUniversity = applications[0]?.university_name || 'University';
  const targetCountry = applications[0]?.universities?.country || 'Poland';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Mock data for demonstration - replace with actual API calls
        const mockHousing: HousingRecord = {
          id: '1',
          student_id: user?.id || '',
          student_name: studentName,
          university_name: targetUniversity,
          housing_type: 'University Dorm',
          accommodation_name: 'Campus Residence Hall A',
          address: '123 University Avenue',
          city: 'Warsaw',
          postal_code: '00-001',
          move_in_date: '2026-09-15',
          contract_duration: '10 months',
          monthly_rent: '€350',
          contact_person: 'Housing Office',
          contact_phone: '+48 22 123 4567',
          contact_email: 'housing@university.edu',
          amenities: ['WiFi', 'Shared Kitchen', 'Laundry', 'Study Room', '24/7 Security'],
          status: 'Confirmed',
          notes: 'Please bring passport copy and student ID for check-in.',
        };

        const mockTravel: TravelRecord = {
          id: '1',
          student_id: user?.id || '',
          flight_number: 'Pending Booking',
          airline: 'To be determined',
          departure_airport: 'Home Airport',
          arrival_airport: 'Warsaw Chopin Airport (WAW)',
          departure_date: '2026-09-10',
          arrival_date: '2026-09-10',
          ticket_status: 'Not Booked',
          pickup_required: true,
          pickup_confirmed: false,
          notes: 'Airport pickup service available upon request.',
        };

        setHousingRecord(mockHousing);
        setTravelRecord(mockTravel);

        // Load saved checklist state
        const saved = localStorage.getItem(`ferex_travel_checklist_${user?.id}`);
        if (saved) {
          setChecklistItems(JSON.parse(saved));
        }
      } catch (err) {
        console.error('[PostTravelHousing] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, studentName, targetUniversity]);

  const preArrivalChecklist = [
    { id: 'visa', label: 'Valid Student Visa Obtained', icon: Shield },
    { id: 'tickets', label: 'Flight Tickets Booked & Confirmed', icon: Plane },
    { id: 'insurance', label: 'Travel & Health Insurance Active', icon: Shield },
    { id: 'documents', label: 'All Documents Packed (Passport, Visa, Acceptance Letter)', icon: CheckCircle2 },
    { id: 'accommodation', label: 'Housing Confirmed & Address Saved', icon: Home },
    { id: 'currency', label: 'Local Currency & International Card Ready', icon: CheckCircle2 },
    { id: 'contacts', label: 'Emergency Contacts & University Info Saved', icon: Phone },
    { id: 'sim', label: 'International SIM or Local SIM Plan Arranged', icon: Phone },
  ];

  const postArrivalChecklist = [
    { id: 'checkin', label: 'Check-in at Accommodation Completed', icon: Home },
    { id: 'registration', label: 'Register with Local Authorities (Residence Permit)', icon: Building },
    { id: 'bank', label: 'Open Local Bank Account', icon: CheckCircle2 },
    { id: 'uni_registration', label: 'Complete University Registration & Get Student ID', icon: Building },
    { id: 'transport', label: 'Obtain Student Transport Pass', icon: Bus },
    { id: 'orientation', label: 'Attend University Orientation Program', icon: Calendar },
  ];

  const toggleChecklistItem = (id: string) => {
    const updated = { ...checklistItems, [id]: !checklistItems[id] };
    setChecklistItems(updated);
    localStorage.setItem(`ferex_travel_checklist_${user?.id}`, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-5 h-5 animate-spin" />
          Loading travel & housing information...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Plane className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Post-Travel & Campus Housing
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Manage your travel arrangements, accommodation details, and arrival checklist for {targetUniversity}.
          </p>
        </div>

        <Badge variant="success" dot>
          Arrival Preparation
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'housing', label: 'Housing Details', icon: Home },
          { id: 'travel', label: 'Travel Info', icon: Plane },
          { id: 'checklist', label: 'Arrival Checklist', icon: CheckCircle2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#58051E] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Housing Tab */}
      {activeTab === 'housing' && housingRecord && (
        <div className="space-y-4">
          {/* Status Banner */}
          <Card className={`p-4 border-2 ${
            housingRecord.status === 'Confirmed' 
              ? 'bg-emerald-50 border-emerald-200' 
              : housingRecord.status === 'Checked In'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {housingRecord.status === 'Confirmed' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : housingRecord.status === 'Checked In' ? (
                  <Home className="w-6 h-6 text-blue-600" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Housing Status: {housingRecord.status}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {housingRecord.status === 'Confirmed' 
                      ? 'Your accommodation is confirmed. Check-in on arrival date.'
                      : housingRecord.status === 'Checked In'
                        ? 'You have successfully checked in to your accommodation.'
                        : 'Housing assignment in progress. You will be notified once confirmed.'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Accommodation Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Building className="w-5 h-5 text-[#58051E]" />
                <h3 className="text-sm font-bold text-slate-900">Accommodation Details</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Type</p>
                  <p className="text-sm font-bold text-slate-900">{housingRecord.housing_type}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Name</p>
                  <p className="text-sm font-bold text-slate-900">{housingRecord.accommodation_name}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Address</p>
                  <p className="text-xs font-medium text-slate-700">
                    {housingRecord.address}<br />
                    {housingRecord.city}, {housingRecord.postal_code}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Move-in Date</p>
                    <p className="text-xs font-bold text-[#58051E]">{new Date(housingRecord.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Monthly Rent</p>
                    <p className="text-xs font-bold text-[#58051E]">{housingRecord.monthly_rent}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Phone className="w-5 h-5 text-[#58051E]" />
                <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Contact Person</p>
                  <p className="text-sm font-bold text-slate-900">{housingRecord.contact_person}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Phone</p>
                  <a href={`tel:${housingRecord.contact_phone}`} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {housingRecord.contact_phone}
                  </a>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Email</p>
                  <a href={`mailto:${housingRecord.contact_email}`} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {housingRecord.contact_email}
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Contract Duration</p>
                  <p className="text-xs font-bold text-slate-900">{housingRecord.contract_duration}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Amenities */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <Bed className="w-5 h-5 text-[#58051E]" />
              <h3 className="text-sm font-bold text-slate-900">Amenities & Facilities</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {housingRecord.amenities.map(amenity => {
                const iconMap: Record<string, any> = {
                  'WiFi': Wifi,
                  'Kitchen': Utensils,
                  'Security': Shield,
                  'Transport': Bus,
                };
                const Icon = iconMap[amenity] || CheckCircle2;

                return (
                  <div key={amenity} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-700">{amenity}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Important Notes */}
          {housingRecord.notes && (
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900 mb-1">Important Notes</h4>
                  <p className="text-xs text-blue-800 leading-relaxed">{housingRecord.notes}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Travel Tab */}
      {activeTab === 'travel' && travelRecord && (
        <div className="space-y-4">
          <Card className={`p-4 border-2 ${
            travelRecord.ticket_status === 'Confirmed'
              ? 'bg-emerald-50 border-emerald-200'
              : travelRecord.ticket_status === 'Booked'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {travelRecord.ticket_status === 'Confirmed' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : travelRecord.ticket_status === 'Booked' ? (
                  <Plane className="w-6 h-6 text-blue-600" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Flight Status: {travelRecord.ticket_status}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {travelRecord.ticket_status === 'Not Booked' 
                      ? 'Please book your travel tickets and update the details.'
                      : travelRecord.ticket_status === 'Booked'
                        ? 'Flight booked. Waiting for confirmation.'
                        : 'Your travel is confirmed. Safe journey!'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Plane className="w-5 h-5 text-[#58051E]" />
                <h3 className="text-sm font-bold text-slate-900">Flight Details</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Flight Number</p>
                  <p className="text-sm font-bold text-slate-900">{travelRecord.flight_number}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Airline</p>
                  <p className="text-sm font-medium text-slate-700">{travelRecord.airline}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Departure</p>
                    <p className="text-xs font-bold text-slate-900">{travelRecord.departure_airport}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(travelRecord.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Arrival</p>
                    <p className="text-xs font-bold text-slate-900">{travelRecord.arrival_airport}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(travelRecord.arrival_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Bus className="w-5 h-5 text-[#58051E]" />
                <h3 className="text-sm font-bold text-slate-900">Airport Pickup Service</h3>
              </div>

              <div className="space-y-3">
                <div className={`p-3 rounded-lg border-2 ${
                  travelRecord.pickup_confirmed
                    ? 'bg-emerald-50 border-emerald-200'
                    : travelRecord.pickup_required
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {travelRecord.pickup_confirmed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : travelRecord.pickup_required ? (
                      <Clock className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Bus className="w-5 h-5 text-slate-500" />
                    )}
                    <span className="text-sm font-bold text-slate-900">
                      {travelRecord.pickup_confirmed 
                        ? 'Pickup Confirmed'
                        : travelRecord.pickup_required
                          ? 'Pickup Requested'
                          : 'No Pickup Requested'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {travelRecord.pickup_confirmed
                      ? 'University will arrange pickup from airport. Driver details will be shared 24 hours before arrival.'
                      : travelRecord.pickup_required
                        ? 'Your pickup request is being processed. You will receive confirmation soon.'
                        : 'You can request airport pickup service by contacting the housing office.'}
                  </p>
                </div>

                {travelRecord.notes && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-800">{travelRecord.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Checklist Tab */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <CheckCircle2 className="w-5 h-5 text-[#58051E]" />
              <h3 className="text-sm font-bold text-slate-900">Pre-Arrival Checklist</h3>
            </div>

            <div className="space-y-2">
              {preArrivalChecklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    checklistItems[item.id]
                      ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                    checklistItems[item.id]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {checklistItems[item.id] && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <item.icon className={`w-4 h-4 ${checklistItems[item.id] ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-semibold ${checklistItems[item.id] ? 'text-emerald-900' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Building className="w-5 h-5 text-[#58051E]" />
              <h3 className="text-sm font-bold text-slate-900">Post-Arrival Checklist</h3>
            </div>

            <div className="space-y-2">
              {postArrivalChecklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    checklistItems[item.id]
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                    checklistItems[item.id]
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {checklistItems[item.id] && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <item.icon className={`w-4 h-4 ${checklistItems[item.id] ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-semibold ${checklistItems[item.id] ? 'text-blue-900' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
