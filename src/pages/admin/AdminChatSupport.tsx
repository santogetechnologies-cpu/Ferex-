import React from 'react';
import { ChatPanel } from '../../components/ChatPanel';

export interface AdminChatSupportProps {
  isStaff?: boolean;
}

export const AdminChatSupport: React.FC<AdminChatSupportProps> = () => <ChatPanel mode="staff" />;
