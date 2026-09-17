import React from 'react';
import { AdminTaskManagement } from '../admin/AdminTaskManagement';

export const StaffTasks: React.FC = () => {
  return <AdminTaskManagement isStaff={true} />;
};
