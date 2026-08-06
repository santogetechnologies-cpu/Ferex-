import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  onClick,
}) => {
  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      whileHover={hoverEffect ? { y: -4, scale: 1.01, boxShadow: '0 12px 20px -8px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.03)' } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'bg-white border border-slate-100 rounded-xl p-5 text-left shadow-sm transition-shadow duration-200',
        hoverEffect && 'cursor-pointer hover:border-slate-200/80',
        className
      )}
    >
      {children}
    </Component>
  );
};
