import React from 'react';
import { useActiveStudentScope } from '../hooks/useActiveStudentScope';
import { ChatPanel } from '../components/ChatPanel';

export const Chat: React.FC = () => {
  const { activeStudentId } = useActiveStudentScope();
  return <ChatPanel mode="student" studentId={activeStudentId || undefined} />;
};
