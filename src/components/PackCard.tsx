import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { OperatorTheme } from '../lib/theme';

export type PackCardType = 'HD' | 'SD' | 'FLEXIBLE';

export interface PackCardProps {
  type: PackCardType;
  operatorTheme: OperatorTheme;
  isSelected: boolean;
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
  operatorTheme,
  isSelected,
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
      label: '👑 RECOMMENDED HD',
      border: operatorTheme.packHdBorder,
      tintBg: operatorTheme.packHdTintBg,
    },
    SD: {
      bg: operatorTheme.packSdBandBg,
      text: operatorTheme.packSdBandText,
      label: '📦 RECOMMENDED SD',
      border: operatorTheme.packSdBorder,
      tintBg: operatorTheme.packSdTintBg,
    },
    FLEXIBLE: {
      bg: operatorTheme.packFlexibleBandBg,
      text: operatorTheme.packFlexibleBandText,
      label: '⚡ FLEXIBLE TOP-UP',
      border: operatorTheme.packFlexibleBorder,
      tintBg: operatorTheme.packFlexibleTintBg,
    },
  }[type];

  // Dynamic border and body background driven strictly by operator theme tokens
  const cardBorder = isSelected
    ? `${bandConfig.border} border-2 ${operatorTheme.cardActiveRing}`
    : `${operatorTheme.packCardBaseBorder} border-2 ${operatorTheme.packCardHoverBorder}`;

  const bodyBg = isSelected
    ? bandConfig.tintBg
    : `${operatorTheme.packCardBaseBg} ${operatorTheme.packCardHoverBg}`;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative rounded-3xl overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-150 ${cardBorder} ${className}`}
    >
      {/* 1. Full-width edge-to-edge solid-color title band */}
      <div
        className="w-full py-3.5 px-4 sm:px-5 flex items-center justify-between transition-colors duration-150 relative select-none min-h-[50px]"
        style={{
          backgroundColor: bandConfig.bg,
          color: bandConfig.text,
        }}
      >
        <span className="text-sm sm:text-base md:text-lg font-black tracking-wide uppercase flex items-center gap-2 drop-shadow-sm pr-20">
          {bandConfig.label}
        </span>
      </div>

      {/* 2. Absolute top-2.5 right-3 Selected indicator floating over the title band */}
      {isSelected && (
        <span
          className={`absolute top-2.5 right-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg shadow-md border animate-in fade-in zoom-in-95 duration-150 z-10 ${operatorTheme.packSelectedBadgeBg} ${operatorTheme.packSelectedBadgeText} ${operatorTheme.packSelectedBadgeBorder}`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Selected</span>
        </span>
      )}

      {/* 3. Padded body containing children (title, description, duration toggle, price, CTA) */}
      <div className={`p-5 flex-1 flex flex-col justify-between transition-colors duration-150 ${bodyBg}`}>
        {children}
      </div>
    </div>
  );
};
