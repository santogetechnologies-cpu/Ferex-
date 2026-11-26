import React, { useEffect } from 'react';
import { FerexVectorMark } from '../components/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Sign-in screens: a burgundy brand panel beside a plain white form. Colours are the burgundy gradient, white and neutral greys only.
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  // Always light, whatever theme the portals use.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => { if (wasDark) { root.classList.add('dark'); root.style.colorScheme = 'dark'; } };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white antialiased font-sans text-neutral-800">
      {/* Brand panel */}
      <aside className="lg:w-[42%] lg:min-h-screen flex items-center justify-center px-6 py-8 lg:py-12 text-white" style={{ background: 'linear-gradient(135deg, #5A0122 0%, #68092A 100%)' }}>
        <div className="flex lg:flex-col items-center lg:text-center gap-4 lg:gap-6">
          <FerexVectorMark color="#FFFFFF" size="xl" />
          <div className="leading-none">
            <p className="font-serif font-black tracking-wide text-3xl sm:text-4xl lg:text-6xl">FEREX</p>
            <p className="mt-2 text-xs sm:text-sm lg:text-base font-semibold tracking-[0.5em] text-white/80">EDUCATION</p>
          </div>
          <p className="hidden lg:block mt-4 max-w-xs text-sm leading-relaxed text-white/75">Your applications, legalization, payments and visa, in one place.</p>
        </div>
      </aside>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-10 py-8 lg:py-12 bg-white">
        <div className="w-full max-w-md text-left">{children}</div>
      </main>
    </div>
  );
};
