import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { login } from '../services/api.ts';
import { User } from '../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both institutional email and security credential.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickPersona = (pEmail: string, pPass: string) => {
    setEmail(pEmail);
    setPassword(pPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 text-sm select-none">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {/* Header with Official Logo */}
        <div className="p-8 pb-6 text-center border-b border-[#F1F5F9] bg-[#FFFFFF]">
          <img
            src="/form2fact-logo.jpg"
            alt="Form2Fact Official Emblem"
            className="h-16 w-auto mx-auto object-contain mb-3 drop-shadow-2xs rounded"
          />
          <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
            Form<span className="text-[#0D9488]">2Fact</span>
          </h1>
          <p className="text-xs text-[#0D9488] font-medium mt-0.5 tracking-wide uppercase">
            From Institutional Claims to Verifiable Evidence
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#F0FDFA] border border-[#99F6E4] rounded-full text-[11px] font-semibold text-[#0D9488]">
            <Shield className="w-3 h-3" />
            <span>AICTE Approval & Scrutiny Portal</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-xs text-[#9F1239] flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="institutional-email"
              className="block text-xs font-semibold text-[#0A2540] uppercase tracking-wider"
            >
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="institutional-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@scrutiny.edu.in"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg text-xs text-[#0A2540] placeholder-[#94A3B8] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="institutional-password"
              className="block text-xs font-semibold text-[#0A2540] uppercase tracking-wider"
            >
              Security Credential
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="institutional-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg text-xs text-[#0A2540] placeholder-[#94A3B8] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#0A2540] hover:bg-[#071A2E] text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Institutional Claims...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span>Access Scrutiny Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0D9488]" />
              </span>
            )}
          </button>
        </form>

        {/* Pre-Seeded Personnel Shortcuts for Rapid Verification */}
        <div className="p-6 pt-0 space-y-2.5 border-t border-[#F1F5F9]">
          <span className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            Quick Persona Login (Testing & Evaluation):
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSelectQuickPersona('aruna.rao@scrutiny.edu.in', 'Reviewer123!')}
              className="p-2.5 text-left border border-[#E2E8F0] hover:border-[#0D9488] hover:bg-[#F0FDFA] rounded-md transition-colors group cursor-pointer"
            >
              <div className="font-semibold text-[#0A2540] group-hover:text-[#0D9488] truncate">
                Dr. Aruna Rao
              </div>
              <div className="text-[11px] text-[#64748B]">Western Reviewer</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickPersona('vk.sharma@scrutiny.edu.in', 'Admin123!')}
              className="p-2.5 text-left border border-[#E2E8F0] hover:border-[#0D9488] hover:bg-[#F0FDFA] rounded-md transition-colors group cursor-pointer"
            >
              <div className="font-semibold text-[#0A2540] group-hover:text-[#0D9488] truncate">
                V. K. Sharma
              </div>
              <div className="text-[11px] text-[#64748B]">Global Administrator</div>
            </button>
          </div>
        </div>

        {/* Institutional Regulatory Footnote */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center text-[10px] text-[#64748B]">
          Authorized institutional access only. All actions are cryptographically signed and audited.
        </div>
      </div>
    </div>
  );
};
