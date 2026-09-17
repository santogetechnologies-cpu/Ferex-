import React from 'react';
import { AdminDashboard } from '../admin/AdminDashboard';

export const StaffDashboard: React.FC = () => {
  return <AdminDashboard isStaff={true} />;
};
