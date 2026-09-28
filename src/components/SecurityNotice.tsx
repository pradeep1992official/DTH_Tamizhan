import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  Terminal, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  Server
} from 'lucide-react';

export const SecurityNotice: React.FC = () => {
  return (
    <div className="bg-[#0e1935] border border-[#1e3058] rounded-2xl p-6 md:p-8 space-y-6 text-left">
      <div className="flex items-center justify-between border-b border-[#172545] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c5a059]/15 text-[#dfb86c] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-serif-royal font-bold text-[#f5f2eb]">
              Security Architecture & Threat Model
            </h2>
            <p className="text-xs text-[#8e9cb4]">
              Structured defense mapping according to OWASP Top 10, LLM Top 10, and Zero-Trust Firebase ABAC
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          5 Threat Zones Guarded
        </span>
      </div>

      {/* Threat Summary Table (Production Directive 1) */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#070e1e] text-[#8e9cb4] uppercase tracking-wider text-[10px] font-bold">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Threat Zone</th>
              <th className="px-4 py-3">Identified Attack Vectors</th>
              <th className="px-4 py-3">Engineering Countermeasures</th>
              <th className="px-4 py-3 rounded-r-lg">Standard Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#172545]">
            <tr>
              <td className="px-4 py-3.5 font-bold text-[#f5f2eb]">
                1. Input Surfaces
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Invalid smart card characters, NoSQL injection, untrusted payload deserialization
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Operator-specific regex validation (10–12 numeric), top-level request body parsing, null-safe destructuring
              </td>
              <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                OWASP A03 / LLM02
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3.5 font-bold text-[#f5f2eb]">
                2. Planning & Reasoning
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                System instruction override, indirect injection from operator responses
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Strict data-only deserialization, contextual state machines, fixed allowed actions
              </td>
              <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                OWASP LLM01
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3.5 font-bold text-[#f5f2eb]">
                3. Tool Execution
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Privilege escalation, unauthorized order updates, unauthorized signal spamming
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Rate-limited refresh pulses, server-verified roles, strict parameter bounds
              </td>
              <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                OWASP A01
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3.5 font-bold text-[#f5f2eb]">
                4. Memory & State
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Cross-tenant viewing card leaks, session hijacking, unauthenticated order manipulation
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Owner-bound Firestore paths (<code className="text-[#dfb86c]">auth.uid == userId</code>), zero insecure defaults, undefined-stripping
              </td>
              <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                Firestore ABAC
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3.5 font-bold text-[#f5f2eb]">
                5. Inter-System Comm
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                API key leakage in browser client bundles, unencrypted gateway tokens
              </td>
              <td className="px-4 py-3.5 text-[#c7d2e5]">
                Google Cloud Secret Manager dynamic ingestion, server-side `/api/*` proxies, zero hardcoded keys
              </td>
              <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                GCP Secret Mgr
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rules & Audit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-[#070e1e] p-4 rounded-xl border border-[#172545] space-y-1.5">
          <div className="flex items-center gap-2 text-[#dfb86c] font-bold text-xs">
            <Lock className="w-4 h-4" />
            <span>Zero Hardcoded Secrets</span>
          </div>
          <p className="text-[11px] text-[#8e9cb4] leading-relaxed">
            All gateway credentials retrieved via Secret Manager or environment variables. No client-side leaks.
          </p>
        </div>

        <div className="bg-[#070e1e] p-4 rounded-xl border border-[#172545] space-y-1.5">
          <div className="flex items-center gap-2 text-[#a4b8db] font-bold text-xs">
            <Database className="w-4 h-4" />
            <span>Strict ABAC Isolation</span>
          </div>
          <p className="text-[11px] text-[#8e9cb4] leading-relaxed">
            Users only access their own <code className="text-[#dfb86c]">dth_connections</code>. Workers gated by <code className="text-[#dfb86c]">is_worker == true</code>.
          </p>
        </div>

        <div className="bg-[#070e1e] p-4 rounded-xl border border-[#172545] space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Server className="w-4 h-4" />
            <span>Undefined-Free Payloads</span>
          </div>
          <p className="text-[11px] text-[#8e9cb4] leading-relaxed">
            Runtime sanitization ensures zero <code className="text-emerald-300">undefined</code> properties ever reach Firestore drivers.
          </p>
        </div>
      </div>
    </div>
  );
};
