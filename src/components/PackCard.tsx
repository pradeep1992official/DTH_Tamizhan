import React from 'react';
import { CheckCircle2, Circle, Ban } from '../lib/icons';
import { OperatorTheme } from '../lib/theme';
import { Language } from '../types';
import { translations } from '../lib/translations';

export type PackCardType = 'HD' | 'SD' | 'FLEXIBLE';

export interface PackCardProps {
  type: PackCardType;
  currentLang?: Language;
  operatorTheme: OperatorTheme;
  isSelected: boolean;
  isUnavailable?: boolean;
  onClick?: () => void;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * PackCard component for Step 3: Select Recharge Pack or Amount
 *
 * Features:
 * - Solid-color full-width title band matching the active operator theme tokens
 * - Edge-to-edge title band with rounded corners clipped via overflow-hidden
 * - Absolute top-2 right-2 "Selected" indicator floating over the title band
 * - Theme-driven light tint selection background highlight on card body
 * - Smooth transition-colors duration-150 toggle
 * - Zero hardcoded hexes or fixed Tailwind color classes
 */
export const PackCard: React.FC<PackCardProps> = ({
  type,
  currentLang = 'en',
  operatorTheme,
  isSelected,
  isUnavailable = false,
  onClick,
  id,
  className = '',
  children,
}) => {
  // Title band configuration derived directly from the active operator's theme tokens
  const bandConfig = {
    HD: {
      bg: operatorTheme.packHdBandBg,
      text: operatorTheme.packHdBandText,
      label: translations[currentLang].recommendedHd,
      border: operatorTheme.packHdBorder,
      tintBg: operatorTheme.packHdTintBg,
    },
    SD: {
      bg: operatorTheme.packSdBandBg,
      text: operatorTheme.packSdBandText,
      label: translations[currentLang].recommendedSd,
      border: operatorTheme.packSdBorder,
      tintBg: operatorTheme.packSdTintBg,
    },
    FLEXIBLE: {
      bg: operatorTheme.packFlexibleBandBg,
      text: operatorTheme.packFlexibleBandText,
      label: translations[currentLang].flexibleTopUp,
      border: operatorTheme.packFlexibleBorder,
      tintBg: operatorTheme.packFlexibleTintBg,
    },
  }[type];

  // Dynamic border and body background driven strictly by operator theme tokens
  const cardBorder = isSelected
    ? `${bandConfig.border} border`
    : `${operatorTheme.packCardBaseBorder} border ${operatorTheme.packCardHoverBorder}`;

  const bodyBg = isSelected
    ? bandConfig.tintBg
    : `${operatorTheme.packCardBaseBg} ${operatorTheme.packCardHoverBg}`;

  return (
    <div
      id={id}
      onClick={onClick}
      role="group"
      aria-label={bandConfig.label}
      data-pack-type={type.toLowerCase()}
      data-selected={isSelected}
      data-unavailable={isUnavailable}
      className={`recharge-pack relative flex flex-col justify-between transition-colors duration-150 ${cardBorder} ${className}`}
    >
      {/* 1. Full-width edge-to-edge solid-color title band */}
      <div
        className="pack-label flex items-center justify-between relative select-none"
      >
        <span className="pack-kind text-sm font-medium flex items-center gap-2">
          {bandConfig.label}
        </span>
        <span className="pack-choice-marker" aria-hidden="true">
          {isSelected ? <CheckCircle2 className="w-5 h-5" /> : isUnavailable ? <Ban className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </span>
        {isSelected && <span className="pack-state-text">{translations[currentLang].selectedAction}</span>}
      </div>

      {/* 3. Padded body containing children (title, description, duration toggle, price, CTA) */}
      <div className={`pack-body flex-1 flex flex-col justify-between ${bodyBg}`}>
        {children}
      </div>
    </div>
  );
};
