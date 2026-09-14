import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Search, Plus, Edit, Save, X, Building, MapPin,
  Phone, Mail, Bed, CheckCircle2, Clock, User
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

interface HousingAssignment {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  university_name: string;
  housing_type: string;
  accommodation_name: string;
  address: string;
  city: string;
  postal_code: string;
  move_in_date: string;
  monthly_rent: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  status: 'Pending' | 'Confirmed' | 'Checked In';
  amenities: string[];
  notes: string;
}

export const AdminHousing: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HousingAssignment | null>(null);

  // Mock data - replace with actual API
  const [housingRecords] = useState<HousingAssignment[]>([
    {
      id: '1',
      student_id: 'student-1',
      student_name: 'John Doe',
      student_email: 'john@example.com',
      university_name: 'Warsaw University',
      housing_type: 'University Dorm',
      accommodation_name: 'Campus Residence Hall A',
      address: '123 University Avenue',
      city: 'Warsaw',
      postal_code: '00-001',
      move_in_date: '2026-09-15',
      monthly_rent: '€350',
      contact_person: 'Housing Office',
      contact_phone: '+48 22 123 4567',
      contact_email: 'housing@university.edu',
      status: 'Confirmed',
      amenities: ['WiFi', 'Shared Kitchen', 'Laundry', '24/7 Security'],
      notes: 'Passport copy required for check-in',
    },
  ]);

  const filteredRecords = housingRecords.filter(record => {
    const matchesSearch = 
      record.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.accommodation_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: housingRecords.length,
    confirmed: housingRecords.filter(r => r.status === 'Confirmed').length,
    pending: housingRecords.filter(r => r.status === 'Pending').length,
    checkedIn: housingRecords.filter(r => r.status === 'Checked In').length,
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Student Housing Management
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Manage accommodation assignments, contact details, and student housing records.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Housing Assignment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Total Assignments</p>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Confirmed</p>
          <p className="text-2xl font-black text-emerald-600">{stats.confirmed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Pending</p>
          <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Checked In</p>
          <p className="text-2xl font-black text-blue-600">{stats.checkedIn}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, email, or accommodation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Checked In">Checked In</option>
          </select>
        </div>
      </Card>

      {/* Housing Records Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredRecords.map(record => (
          <Card key={record.id} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold shrink-0">
                  {record.student_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{record.student_name}</h3>
                  <p className="text-xs text-slate-500">{record.student_email}</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{record.university_name}</p>
                </div>
              </div>

              <Badge 
                variant={
                  record.status === 'Confirmed' ? 'success' :
                  record.status === 'Checked In' ? 'default' :
                  'warning'
                }
              >
                {record.status}
              </Badge>
            </div>

            <div className="space-y-3 py-3 border-t border-b border-slate-100">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Accommodation</p>
                <p className="text-xs font-bold text-slate-900">{record.accommodation_name}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{record.housing_type}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Address</p>
                <p className="text-xs text-slate-700">
                  {record.address}, {record.city} {record.postal_code}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Move-in Date</p>
                  <p className="text-xs font-bold text-[#58051E]">
                    {new Date(record.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Monthly Rent</p>
                  <p className="text-xs font-bold text-[#58051E]">{record.monthly_rent}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700">{record.contact_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700">{record.contact_email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <Button
                size="xs"
                variant="outline"
                onClick={() => setEditingRecord(record)}
                leftIcon={<Edit className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {/* View details */}}
              >
                View Full Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <Card className="p-12 text-center">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No Housing Records Found</h3>
          <p className="text-xs text-slate-500 mb-4">
            {searchQuery || statusFilter !== 'All' 
              ? 'Try adjusting your search or filters'
              : 'Start by adding housing assignments for students'}
          </p>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add First Housing Assignment
          </Button>
        </Card>
      )}
    </div>
  );
};
