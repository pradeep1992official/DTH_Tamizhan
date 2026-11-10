import React from 'react';
import { CheckCircle2, Database, Lock, Server, ShieldCheck } from 'lucide-react';
import { OperatorTheme } from '../lib/theme';

interface SecurityNoticeProps {
  currentTheme: OperatorTheme;
}

const THREAT_ROWS = [
  {
    zone: 'Input surfaces',
    vectors: 'Invalid smart-card characters, injection attempts, oversized uploads',
    controls: 'Operator-specific input validation, request schemas, and upload limits',
    standard: 'OWASP A03',
  },
  {
    zone: 'Planning and reasoning',
    vectors: 'Instruction override and indirect injection from external inputs',
    controls: 'Data-only deserialization, contextual state validation, and fixed allowed operators',
    standard: 'OWASP LLM01',
  },
  {
    zone: 'Tool execution',
    vectors: 'Privilege escalation, unauthorized order updates, transponder flooding',
    controls: 'Rate limits on sensitive operations and verified Firebase ID tokens',
    standard: 'OWASP A01',
  },
  {
    zone: 'Memory and state',
    vectors: 'Cross-tenant data access, unauthorized overwrites, undefined values',
    controls: 'Owner-bound Firestore paths, access rules, and payload sanitization',
    standard: 'Firestore rules',
  },
  {
    zone: 'Inter-system communication',
    vectors: 'API-key leakage and hardcoded credentials',
    controls: 'Server-side API proxies and environment-based secret injection',
    standard: 'OWASP A02 / A05',
  },
];

export const SecurityNotice: React.FC<SecurityNoticeProps> = ({ currentTheme }) => {
  const isLight = currentTheme.isLightMode;
  const surface = isLight ? 'bg-white border-gray-200 text-gray-900' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} text-white`;
  const nestedSurface = isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/10';
  const primaryText = isLight ? 'text-gray-900' : 'text-white';
  const secondaryText = isLight ? 'text-gray-700' : 'text-gray-300';
  const mutedText = isLight ? 'text-gray-700' : 'text-gray-300';

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 md:p-8 space-y-6 text-left ${surface}`}>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-500/20 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${currentTheme.primaryColor}20`, color: currentTheme.primaryColor }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-lg sm:text-xl font-bold ${primaryText}`}>Security controls overview</h1>
            <p className={`text-sm mt-1 leading-relaxed ${secondaryText}`}>
              A summary of security controls described for this application.
            </p>
          </div>
        </div>
        <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-1.5 ${
          isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          5 control areas
        </span>
      </header>

      <div className="space-y-3 md:hidden">
        {THREAT_ROWS.map((row) => (
          <article key={row.zone} className={`rounded-xl border p-4 space-y-2 ${nestedSurface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`font-bold ${primaryText}`}>{row.zone}</h2>
              <span className="text-xs font-mono font-semibold" style={{ color: currentTheme.primaryColor }}>
                {row.standard}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${mutedText}`}><strong>Risk:</strong> {row.vectors}</p>
            <p className={`text-sm leading-relaxed ${mutedText}`}><strong>Controls:</strong> {row.controls}</p>
          </article>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-500/20">
        <table className="w-full text-left text-sm">
          <thead className={nestedSurface}>
            <tr>
              <th className="px-4 py-3 font-semibold">Control area</th>
              <th className="px-4 py-3 font-semibold">Example risks</th>
              <th className="px-4 py-3 font-semibold">Described controls</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-500/20">
            {THREAT_ROWS.map((row) => (
              <tr key={row.zone}>
                <th scope="row" className={`px-4 py-3.5 font-semibold align-top ${primaryText}`}>{row.zone}</th>
                <td className={`px-4 py-3.5 align-top leading-relaxed ${mutedText}`}>{row.vectors}</td>
                <td className={`px-4 py-3.5 align-top leading-relaxed ${mutedText}`}>{row.controls}</td>
                <td className="px-4 py-3.5 align-top font-mono text-xs font-semibold whitespace-nowrap" style={{ color: currentTheme.primaryColor }}>
                  {row.standard}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className={`p-4 rounded-xl border space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-semibold text-sm" style={{ color: currentTheme.primaryColor }}>
            <Lock className="w-4 h-4" />
            Credential handling
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            The project describes server-side environment configuration for sensitive credentials.
          </p>
        </article>
        <article className={`p-4 rounded-xl border space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-semibold text-sm" style={{ color: currentTheme.primaryColor }}>
            <Database className="w-4 h-4" />
            Data access
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            Firestore rules define access for customer connections and administrative data.
          </p>
        </article>
        <article className={`p-4 rounded-xl border space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-semibold text-sm" style={{ color: currentTheme.primaryColor }}>
            <Server className="w-4 h-4" />
            Server requests
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            Server routes validate request bodies and sanitize selected Firestore payloads.
          </p>
        </article>
      </div>

      <p className={`text-xs leading-relaxed border-t border-gray-500/20 pt-4 ${secondaryText}`}>
        This page summarizes project documentation; it is not an independent security assessment. Effective protection depends on deployment and configuration.
      </p>
    </section>
  );
};
