import React from 'react';
import { GraduationCap } from 'lucide-react';

interface AIVoiceVisualizerProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number; // 0 to 1
  className?: string;
}

const BAR_DURATIONS = [474, 433, 407, 458, 400, 427, 441, 419, 487, 442];

export const AIVoiceVisualizer: React.FC<AIVoiceVisualizerProps> = ({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  className = '',
}) => {
  const isLive = isListening || isSpeaking;
  const dynamicLevel = Math.max(0, Math.min(1, audioLevel));

  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-6 select-none ${className}`}>
      {/* Sound Bar Animation Styles */}
      <style>{`
        @keyframes soundWaveWhite {
          0% {
            opacity: 0.35;
            height: 4px;
          }
          100% {
            opacity: 1;
            height: 70px;
          }
        }
        .voice-bar-anim {
          animation: soundWaveWhite 0ms -600ms linear infinite alternate;
        }
      `}</style>

      {/* Center White Graduation Cap with Glow */}
      <div className="relative flex items-center justify-center">
        {/* Soft Ambient White/Gold Glow */}
        <div
          className={`absolute w-24 h-24 rounded-full transition-all duration-300 blur-xl ${
            isSpeaking
              ? 'bg-white/50 scale-125'
              : isListening
              ? 'bg-white/30 scale-110'
              : 'bg-white/10 scale-95'
          }`}
        />

        {/* Central White Graduation Cap Badge */}
        <div className="relative w-16 h-16 rounded-full bg-white shadow-2xl border-2 border-white flex items-center justify-center transform transition-transform duration-200">
          <GraduationCap
            className={`w-9 h-9 text-[#58051E] transition-all duration-200 ${
              isSpeaking
                ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                : isListening
                ? 'scale-105'
                : 'scale-100'
            }`}
            strokeWidth={2.4}
          />
        </div>
      </div>

      {/* 10 White Soundwave Equalizer Bars */}
      <div id="bars" className="flex items-center justify-center h-20 gap-1.5 px-4">
        {BAR_DURATIONS.map((dur, idx) => {
          // Calculate dynamic height when live or fallback to CSS animation
          const activeHeight = Math.max(4, Math.min(72, (20 + (idx % 3) * 15) * (0.5 + dynamicLevel * 1.8)));

          return (
            <div
              key={idx}
              className="w-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-75"
              style={{
                height: isLive ? `${activeHeight}px` : '4px',
                opacity: isLive ? (isSpeaking ? 1 : 0.85) : 0.35,
                animationDuration: `${dur}ms`,
                animationName: isLive ? 'soundWaveWhite' : 'none',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationDelay: `-${(idx * 60)}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AIVoiceVisualizer;
