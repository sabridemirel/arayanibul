import React from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Purple gradient frame shared by the standalone auth pages (login-style). */
const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#5A189A] via-[#7B2CBF] to-[#3c0764] flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex flex-col items-center gap-2">
          <img
            src="/assets/mascot.png"
            alt="Arayanibul Maskot"
            className="h-20 w-20 object-contain mx-auto"
          />
          <span className="text-2xl font-extrabold">
            <span className="text-white">Arayanı</span>
            <span className="text-[#F59E0B]">BUL</span>
          </span>
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-white/70">{subtitle}</p>}
      </div>

      <Card padding="lg" className="!bg-white/95 backdrop-blur-sm !shadow-2xl shadow-purple-900/50">
        {children}
      </Card>
    </div>
  </div>
);

export default AuthShell;
