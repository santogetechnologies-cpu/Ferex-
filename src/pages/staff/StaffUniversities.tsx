import React from 'react';
import { AdminUniversities } from '../admin/AdminUniversities';

export const StaffUniversities: React.FC = () => {
  return <AdminUniversities isStaff={true} />;
};
