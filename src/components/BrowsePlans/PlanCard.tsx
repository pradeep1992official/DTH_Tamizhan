import { formatPrice, formatMonthlyEquivalent, formatDuration, formatChannelCounts, formatCatalogIssues, validateCatalogPack } from '../../lib/catalog';
import React from 'react';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';
import { OperatorCardLogo } from '../BrandAssets';

interface PlanCardProps {
  plan: BrowsePlan;
  currentTheme: OperatorTheme;
  currentLang: Language;
  isSelectedForCompare: boolean;
  onToggleCompare: (plan: BrowsePlan) => void;
  canAddToCompare: boolean;
  onSelectPlan: (plan: BrowsePlan) => void;
}

const OPERATOR_NAMES: Record<string, { name: string; tamil: string; color: string }> = {
  sun_direct: { name: 'Sun Direct', tamil: 'சன் டைரக்ட்', color: 'var(--operator-sun-direct)' },
  tata_play: { name: 'Tata Play', tamil: 'டாடா பிளே', color: 'var(--operator-tata-play)' },
  airtel_dth: { name: 'Airtel Digital TV', tamil: 'ஏர்டெல் டிவி', color: 'var(--operator-airtel-dth)' },
  dish_tv: { name: 'Dish TV & D2H', tamil: 'டிஷ் டிவி & டி2எச்', color: 'var(--operator-dish-tv)' },
  d2h: { name: 'Dish TV & D2H', tamil: 'டிஷ் டிவி & டி2எச்', color: 'var(--operator-dish-tv)' },
};

export function CatalogColumnHeadings({ currentLang }: { currentLang: Language }) {
  const t = translations[currentLang];
  return <div className="catalog-column-headings">
    <span>{t.uiCatalogOperator}</span><span>{t.uiCatalogPack}</span>
    <span>{t.uiCatalogDuration}</span><span>{t.uiCatalogTotal}</span><span>{t.uiCatalogAction}</span>
  </div>;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentTheme,
  currentLang,
  isSelectedForCompare,
  onToggleCompare,
  canAddToCompare,
  onSelectPlan,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const opInfo = OPERATOR_NAMES[plan.operator] || {
    name: plan.operator,
    tamil: '',
    color: currentTheme.primaryColor,
  };


  const duration = formatDuration(plan.duration_months, currentLang);
  const planName = currentLang === 'ta' && plan.tamilName ? plan.tamilName : plan.name;

  const channelListUrl = (() => {
    if (!plan.channel_list_url) return null;
    try {
      const url = new URL(plan.channel_list_url, window.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  })();
  const channelListLabel = translations[currentLang].uiChannelList;

  return (
    <article
      className={`catalog-plan compact-plan border ${isLight ? 'bg-paper border-rule text-ink' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} text-accent-ink`}`}
      style={{ borderColor: isSelectedForCompare ? currentTheme.primaryColor : undefined }}
    >
      <header className="compact-plan-header">
        <div className="compact-plan-pills">
          <div
            className="catalog-operator-identity"
            data-operator={plan.operator}
          >
            <OperatorCardLogo operatorId={plan.operator} className="catalog-operator-logo-image" />
            <span className="catalog-operator-name">{currentLang === 'ta' && opInfo.tamil ? opInfo.tamil : opInfo.name}</span>
          </div>
          <span className="compact-plan-pill compact-plan-quality" data-quality={plan.type}>{plan.type}</span>
          <span className="compact-plan-pill compact-plan-duration" data-duration={plan.duration_months}>{duration}</span>
        </div>
      </header>

      <div className="compact-plan-details">
      <h3 className="font-bold wrap-break-word">{planName}</h3>
      <p className="compact-plan-summary text-sm text-muted">
        <span>{formatChannelCounts(plan, currentLang)}</span>
      </p>
      {validateCatalogPack(plan).length > 0 && <p role="status" className="text-error text-xs">{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(plan, currentLang)}</p>}
      {channelListUrl && (
        <a className="compact-plan-channel-link" href={channelListUrl} target="_blank" rel="noopener noreferrer" aria-label={`${channelListLabel}: ${planName}`}>
          {channelListLabel} <span aria-hidden="true">&rarr;</span>
        </a>
      )}
      </div>
      <span className="catalog-duration-cell">{duration}</span>

      <footer className="compact-plan-footer">
        <div className="compact-plan-price">
          <span className="text-2xl font-bold tabular-nums tracking-tight">{formatPrice(plan.price, currentLang)}</span>
          <span className="compact-plan-total block text-xs text-muted">
            {currentLang === 'ta' ? `${duration} \u0bae\u0bca\u0ba4\u0bcd\u0ba4\u0bae\u0bcd` : `Total for ${duration.toLowerCase()}`}
          </span>
          <span className="compact-plan-monthly block text-xs text-muted">
            {formatMonthlyEquivalent(plan.price, plan.duration_months, currentLang)}
          </span>
        </div>
        <div className="compact-plan-actions">
        <label className="compact-plan-compare text-xs text-muted">
          <input
            type="checkbox"
            checked={isSelectedForCompare}
            onChange={() => onToggleCompare(plan)}
            disabled={!isSelectedForCompare && !canAddToCompare}
            aria-label={`${t.addToCompare}: ${planName}`}
            style={{ accentColor: currentTheme.primaryColor }}
          />
          {t.addToCompare}
        </label>
        <button
          type="button"
          onClick={() => onSelectPlan(plan)}
          aria-label={`${t.selectThisPack}: ${planName}`}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-accent-ink"
          style={{ backgroundColor: currentTheme.primaryColor }}
        >
          {t.selectThisPack}
        </button>
        </div>
      </footer>
    </article>
  );
};
