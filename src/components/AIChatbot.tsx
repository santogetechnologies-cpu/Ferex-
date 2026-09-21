import React from 'react';
import { EnterpriseAIChatbot } from './EnterpriseAIChatbot';
import type { LiveStudentContext } from '../lib/api/openrouterChat';

interface AIChatbotProps {
  mode?: 'landing' | 'student';
  studentContext?: LiveStudentContext;
  initialOpen?: boolean;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  mode = 'landing',
  studentContext,
  initialOpen = false,
}) => {
  return (
    <EnterpriseAIChatbot
      role={mode === 'student' ? 'student' : 'guest'}
      studentContext={studentContext}
      initialOpen={initialOpen}
    />
  );
};

export default AIChatbot;
