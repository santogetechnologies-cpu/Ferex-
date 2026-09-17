import React from 'react';
import { AdminStudents } from '../admin/AdminStudents';

export const StaffStudents: React.FC = () => {
  return <AdminStudents isStaff={true} />;
};
