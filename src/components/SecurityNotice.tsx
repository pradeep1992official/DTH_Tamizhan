import React from 'react';
import { CheckCircle2, Database, Lock, Server, ShieldCheck } from '../lib/icons';
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
  const surface = isLight ? 'bg-paper border-rule text-ink' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} text-accent-ink`;
  const nestedSurface = isLight ? 'bg-paper-2 border-rule' : 'bg-scrim/20 border-rule-strong';
  const primaryText = isLight ? 'text-ink' : 'text-accent-ink';
  const secondaryText = isLight ? 'text-ink-2' : 'text-muted';
  const mutedText = isLight ? 'text-ink-2' : 'text-muted';

  return (
    <section className={`security-page space-y-6 text-left ${surface}`}>
      <header className="page-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `color-mix(in oklab, ${currentTheme.primaryColor} 13%, transparent)`, color: currentTheme.primaryColor }}
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
        <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 ${
          isLight ? 'bg-success-soft text-success border-success' : 'bg-success-soft text-success border-rule'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          5 control areas
        </span>
      </header>

      <div className="space-y-3 md:hidden">
        {THREAT_ROWS.map((row) => (
          <article key={row.zone} className={`security-row space-y-2 ${nestedSurface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`font-bold ${primaryText}`}>{row.zone}</h2>
              <span className="text-xs font-mono font-medium" style={{ color: currentTheme.primaryColor }}>
                {row.standard}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${mutedText}`}><strong>Risk:</strong> {row.vectors}</p>
            <p className={`text-sm leading-relaxed ${mutedText}`}><strong>Controls:</strong> {row.controls}</p>
          </article>
        ))}
      </div>

      <div className="security-table hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={nestedSurface}>
            <tr>
              <th className="px-4 py-3 font-medium">Control area</th>
              <th className="px-4 py-3 font-medium">Example risks</th>
              <th className="px-4 py-3 font-medium">Described controls</th>
              <th className="px-4 py-3 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-strong">
            {THREAT_ROWS.map((row) => (
              <tr key={row.zone}>
                <th scope="row" className={`px-4 py-3.5 font-medium align-top ${primaryText}`}>{row.zone}</th>
                <td className={`px-4 py-3.5 align-top leading-relaxed ${mutedText}`}>{row.vectors}</td>
                <td className={`px-4 py-3.5 align-top leading-relaxed ${mutedText}`}>{row.controls}</td>
                <td className="px-4 py-3.5 align-top font-mono text-xs font-medium whitespace-nowrap" style={{ color: currentTheme.primaryColor }}>
                  {row.standard}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className={`security-row space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-medium text-sm" style={{ color: currentTheme.primaryColor }}>
            <Lock className="w-4 h-4" />
            Credential handling
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            The project describes server-side environment configuration for sensitive credentials.
          </p>
        </article>
        <article className={`security-row space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-medium text-sm" style={{ color: currentTheme.primaryColor }}>
            <Database className="w-4 h-4" />
            Data access
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            Firestore rules define access for customer connections and administrative data.
          </p>
        </article>
        <article className={`security-row space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-medium text-sm" style={{ color: currentTheme.primaryColor }}>
            <Server className="w-4 h-4" />
            Server requests
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            Server routes validate request bodies and sanitize selected Firestore payloads.
          </p>
        </article>
      </div>

      <p className={`text-xs leading-relaxed border-t border-rule-strong pt-4 ${secondaryText}`}>
        This page summarizes project documentation; it is not an independent security assessment. Effective protection depends on deployment and configuration.
      </p>
    </section>
  );
};
