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
      whileHover={hoverEffect ? { y: -2 } : {}}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl p-5 text-left shadow-subtle dark:shadow-black/40 transition-all duration-200',
        hoverEffect && 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-card',
        className
      )}
    >
      {children}
    </Component>
  );
};

