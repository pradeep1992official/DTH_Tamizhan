import { translations } from '../lib/translations';
import type { Language } from '../types';
import React from 'react';
import { CheckCircle2, Database, Lock, Server, ShieldCheck } from '../lib/icons';
import { OperatorTheme } from '../lib/theme';

interface SecurityNoticeProps {
  currentTheme: OperatorTheme;
  currentLang?: Language;
}

const THREAT_ROWS = (t: typeof translations.en) => [
  {
    zone: t.uiSecurityInputSurfaces,
    vectors: t.uiSecurityInvalidSmartCardCharactersInjectionAttemptsOversizedUploads,
    controls: t.uiSecurityOperatorSpecificInputValidationRequestSchemasAndUploadLimits,
    standard: 'OWASP A03',
  },
  {
    zone: t.uiSecurityPlanningAndReasoning,
    vectors: t.uiSecurityInstructionOverrideAndIndirectInjectionFromExternalInputs,
    controls: t.uiSecurityDataOnlyDeserializationContextualStateValidationAndFixedAllowedOp,
    standard: 'OWASP LLM01',
  },
  {
    zone: t.uiSecurityToolExecution,
    vectors: t.uiSecurityPrivilegeEscalationUnauthorizedOrderUpdatesTransponderFlooding,
    controls: t.uiSecurityRateLimitsOnSensitiveOperationsAndVerifiedFirebaseIDTokens,
    standard: 'OWASP A01',
  },
  {
    zone: t.uiSecurityMemoryAndState,
    vectors: t.uiSecurityCrossTenantDataAccessUnauthorizedOverwritesUndefinedValues,
    controls: t.uiSecurityOwnerBoundFirestorePathsAccessRulesAndPayloadSanitization,
    standard: t.uiSecurityFirestoreRules,
  },
  {
    zone: t.uiSecurityInterSystemCommunication,
    vectors: t.uiSecurityAPIKeyLeakageAndHardcodedCredentials,
    controls: t.uiSecurityServerSideAPIProxiesAndEnvironmentBasedSecretInjection,
    standard: 'OWASP A02 / A05',
  },
];

export const SecurityNotice: React.FC<SecurityNoticeProps> = ({ currentTheme, currentLang = 'en' }) => {
  const t = translations[currentLang];
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
            <h1 className={`text-lg sm:text-xl font-bold ${primaryText}`}>{t.uiSecuritySecurityControlsOverview}</h1>
            <p className={`text-sm mt-1 leading-relaxed ${secondaryText}`}>
              {t.uiSecurityASummaryOfSecurityControlsDescribedForThisApplication}
            </p>
          </div>
        </div>
        <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 ${
          isLight ? 'bg-success-soft text-success border-success' : 'bg-success-soft text-success border-rule'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {t.uiSecurity5ControlAreas}
        </span>
      </header>

      <div className="space-y-3 md:hidden">
        {THREAT_ROWS(t).map((row) => (
          <article key={row.zone} className={`security-row space-y-2 ${nestedSurface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`font-bold ${primaryText}`}>{row.zone}</h2>
              <span className="text-xs font-mono font-medium" style={{ color: currentTheme.primaryColor }}>
                {row.standard}
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${mutedText}`}><strong>{t.uiSecurityRisk}</strong> {row.vectors}</p>
            <p className={`text-sm leading-relaxed ${mutedText}`}><strong>{t.uiSecurityControls}</strong> {row.controls}</p>
          </article>
        ))}
      </div>

      <div className="security-table hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={nestedSurface}>
            <tr>
              <th className="px-4 py-3 font-medium">{t.uiSecurityControlArea}</th>
              <th className="px-4 py-3 font-medium">{t.uiSecurityExampleRisks}</th>
              <th className="px-4 py-3 font-medium">{t.uiSecurityDescribedControls}</th>
              <th className="px-4 py-3 font-medium">{t.uiSecurityReference}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-strong">
            {THREAT_ROWS(t).map((row) => (
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
            {t.uiSecurityCredentialHandling}
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            {t.uiSecurityTheProjectDescribesServerSideEnvironmentConfigurationForSensitive}
          </p>
        </article>
        <article className={`security-row space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-medium text-sm" style={{ color: currentTheme.primaryColor }}>
            <Database className="w-4 h-4" />
            {t.uiSecurityDataAccess}
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            {t.uiSecurityFirestoreRulesDefineAccessForCustomerConnectionsAndAdministrative}
          </p>
        </article>
        <article className={`security-row space-y-2 ${nestedSurface}`}>
          <h2 className="flex items-center gap-2 font-medium text-sm" style={{ color: currentTheme.primaryColor }}>
            <Server className="w-4 h-4" />
            {t.uiSecurityServerRequests}
          </h2>
          <p className={`text-sm leading-relaxed ${mutedText}`}>
            {t.uiSecurityServerRoutesValidateRequestBodiesAndSanitizeSelectedFirestorePayl}
          </p>
        </article>
      </div>

      <p className={`text-xs leading-relaxed border-t border-rule-strong pt-4 ${secondaryText}`}>
        {t.uiSecurityThisPageSummarizesProjectDocumentationItIsNotAnIndependentSecurit}
      </p>
    </section>
  );
};
