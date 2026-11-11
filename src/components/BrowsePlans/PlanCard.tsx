import React from 'react';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';

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

  const monthlyRate = plan.monthly_equivalent_rate || Math.round(plan.price / plan.duration_months);

  const duration = `${plan.duration_months} ${plan.duration_months === 1 ? t.month : t.months}`;
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
  const channelListLabel = currentLang === 'ta' ? '\u0b9a\u0bc7\u0ba9\u0bb2\u0bcd \u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bcd' : 'Channel list';

  return (
    <article
      className={`catalog-plan compact-plan border ${isLight ? 'bg-paper border-rule text-ink' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} text-accent-ink`}`}
      style={{ borderColor: isSelectedForCompare ? currentTheme.primaryColor : undefined }}
    >
      <header className="compact-plan-header">
        <div className="compact-plan-pills">
          <span
            className="compact-plan-pill compact-plan-operator"
            data-operator={plan.operator}
          >
            {currentLang === 'ta' && opInfo.tamil ? opInfo.tamil : opInfo.name}
          </span>
          <span className="compact-plan-pill compact-plan-quality" data-quality={plan.type}>{plan.type}</span>
          <span className="compact-plan-pill compact-plan-duration" data-duration={plan.duration_months}>{duration}</span>
        </div>
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
      </header>

      <h3 className="font-bold break-words">{planName}</h3>
      <p className="compact-plan-summary text-sm text-muted">
        <span>{plan.channel_count} {t.channels}{plan.hd_channel_count ? (currentLang === 'ta' ? ` (${plan.hd_channel_count} HD)` : `, including ${plan.hd_channel_count} HD`) : ''}</span>
      </p>
      {channelListUrl && (
        <a className="compact-plan-channel-link" href={channelListUrl} target="_blank" rel="noopener noreferrer" aria-label={`${channelListLabel}: ${planName}`}>
          {channelListLabel} <span aria-hidden="true">&rarr;</span>
        </a>
      )}

      <footer className="compact-plan-footer">
        <div className="compact-plan-price">
          <span className="text-2xl font-bold tabular-nums tracking-tight">Rs. {plan.price}</span>
          <span className="compact-plan-total block text-xs text-muted">
            {currentLang === 'ta' ? `${duration} \u0bae\u0bca\u0ba4\u0bcd\u0ba4\u0bae\u0bcd` : `Total for ${duration.toLowerCase()}`}
          </span>
          {plan.duration_months > 1 && (
            <span className="compact-plan-monthly block text-xs text-muted">
              Rs. {monthlyRate} {t.perMonth}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelectPlan(plan)}
          aria-label={`${t.selectThisPack}: ${planName}`}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-accent-ink"
          style={{ backgroundColor: currentTheme.primaryColor }}
        >
          {t.selectThisPack}
        </button>
      </footer>
    </article>
  );
};
