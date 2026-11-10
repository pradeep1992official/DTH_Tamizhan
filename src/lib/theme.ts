import { DthOperatorId } from '../types';

export interface OperatorTheme {
  id: DthOperatorId;
  name: string;
  tagline: string;
  isLightMode: boolean;
  
  // Base Page & Canvas
  pageBg: string;
  pageText: string;
  headingText: string;
  subText: string;
  mutedText: string;
  surfaceBorder: string;

  // Header & Navigation
  headerBg: string;
  headerBorder: string;
  statusStripBg: string;
  statusStripText: string;
  statusStripBorder: string;
  navContainerBg: string;
  navContainerBorder: string;
  navActiveBg: string;
  navActiveText: string;
  navInactiveText: string;
  navInactiveHoverBg: string;

  // Hero Section
  heroGradient: string;
  heroBorder: string;
  heroTitleColor: string;
  heroTitleHighlight: string;
  heroSubtitleColor: string;
  heroPillBg: string;
  heroPillText: string;
  heroPillBorder: string;
  heroBadgeItemBg: string;
  heroBadgeItemText: string;
  heroBadgeItemBorder: string;

  // Cards & Containers (Step 1, 2, 3)
  mainContainerBg: string;
  mainContainerBorder: string;
  stepNumberBg: string;
  stepNumberText: string;
  cardInactiveBg: string;
  cardInactiveBorder: string;
  cardInactiveText: string;
  cardInactiveHoverBorder: string;
  cardActiveBg: string;
  cardActiveBorder: string;
  cardActiveRing: string;
  cardActiveText: string;

  // Pack Cards (Step 3: HD, SD, Flexible)
  packHdBandBg: string;
  packHdBandText: string;
  packHdTintBg: string;
  packHdBorder: string;

  packSdBandBg: string;
  packSdBandText: string;
  packSdTintBg: string;
  packSdBorder: string;

  packFlexibleBandBg: string;
  packFlexibleBandText: string;
  packFlexibleTintBg: string;
  packFlexibleBorder: string;

  packCardBaseBg: string;
  packCardBaseBorder: string;
  packCardHoverBorder: string;
  packCardHoverBg: string;
  packSelectedBadgeBg: string;
  packSelectedBadgeText: string;
  packSelectedBadgeBorder: string;

  // Inputs
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  inputBorder: string;
  inputFocusBorder: string;
  inputStyleClass: string;

  // Buttons & Badges
  primaryColor: string;
  accentColor: string;
  ctaButtonClass: string;
  cardButtonActive: string;
  cardButtonInactive: string;
  durationPillContainerBg: string;
  durationPillActive: string;
  durationPillInactive: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  savingsBadgeBg: string;
  savingsBadgeText: string;
  savingsBadgeBorder: string;

  // Footer
  footerBg: string;
  footerBorder: string;
  footerText: string;
  footerLinkHover: string;

  // Brand Styling & Typography
  fontHeadingClass: string;
  fontBodyClass: string;
  brandTag: string;
  brandAccentText: string;
}

const shared = {
  "pageBg": "bg-paper-2",
  "pageText": "text-ink",
  "headingText": "text-ink",
  "subText": "text-ink-2",
  "mutedText": "text-muted",
  "surfaceBorder": "border-rule",
  "headerBg": "bg-paper",
  "headerBorder": "border-rule",
  "statusStripBg": "bg-paper",
  "statusStripText": "text-muted",
  "statusStripBorder": "border-rule",
  "navContainerBg": "bg-transparent",
  "navContainerBorder": "border-transparent",
  "navActiveBg": "bg-accent-soft",
  "navActiveText": "text-accent",
  "navInactiveText": "text-muted",
  "navInactiveHoverBg": "hover:bg-paper-2 hover:text-ink",
  "heroGradient": "",
  "heroBorder": "border-rule",
  "heroTitleColor": "text-ink",
  "heroTitleHighlight": "text-ink",
  "heroSubtitleColor": "text-muted",
  "heroPillBg": "bg-paper-2",
  "heroPillText": "text-ink",
  "heroPillBorder": "border-rule",
  "heroBadgeItemBg": "bg-transparent",
  "heroBadgeItemText": "text-muted",
  "heroBadgeItemBorder": "border-transparent",
  "mainContainerBg": "bg-paper",
  "mainContainerBorder": "border-rule",
  "stepNumberBg": "bg-paper-3",
  "stepNumberText": "text-ink",
  "cardInactiveBg": "bg-paper",
  "cardInactiveBorder": "border-rule",
  "cardInactiveText": "text-ink",
  "cardInactiveHoverBorder": "hover:border-accent",
  "cardActiveBg": "bg-accent-soft",
  "cardActiveBorder": "border-accent",
  "cardActiveRing": "ring-1 ring-accent",
  "cardActiveText": "text-ink",
  "packCardBaseBg": "bg-paper",
  "packCardBaseBorder": "border-rule",
  "packCardHoverBorder": "hover:border-accent",
  "packCardHoverBg": "hover:bg-paper-2",
  "packSelectedBadgeBg": "bg-accent-soft",
  "packSelectedBadgeText": "text-accent",
  "packSelectedBadgeBorder": "border-transparent",
  "inputBg": "bg-paper",
  "inputText": "text-ink",
  "inputPlaceholder": "placeholder-muted",
  "inputBorder": "border-rule-strong",
  "inputFocusBorder": "focus:border-accent",
  "inputStyleClass": "rounded-input px-4 py-3 border",
  "ctaButtonClass": "btn-primary",
  "cardButtonActive": "bg-accent text-accent-ink",
  "cardButtonInactive": "bg-paper-2 text-ink hover:bg-paper-3",
  "durationPillContainerBg": "bg-paper-2 border-transparent",
  "durationPillActive": "bg-paper text-ink shadow-control",
  "durationPillInactive": "text-muted hover:text-ink",
  "badgeBg": "bg-accent-soft",
  "badgeText": "text-accent",
  "badgeBorder": "border-transparent",
  "savingsBadgeBg": "bg-success-soft",
  "savingsBadgeText": "text-success",
  "savingsBadgeBorder": "border-transparent",
  "footerBg": "bg-paper",
  "footerBorder": "border-rule",
  "footerText": "text-muted",
  "footerLinkHover": "hover:text-accent",
  "fontHeadingClass": "font-heading font-bold tracking-tight",
  "fontBodyClass": "font-sans",
  "brandAccentText": "text-accent",
  "packHdBandBg": "var(--color-ink)",
  "packHdBandText": "var(--color-paper)",
  "packHdTintBg": "bg-paper",
  "packHdBorder": "border-accent",
  "packSdBandBg": "var(--color-ink)",
  "packSdBandText": "var(--color-paper)",
  "packSdTintBg": "bg-paper",
  "packSdBorder": "border-accent",
  "packFlexibleBandBg": "var(--color-ink)",
  "packFlexibleBandText": "var(--color-paper)",
  "packFlexibleTintBg": "bg-paper",
  "packFlexibleBorder": "border-accent"
};

const operator = (id: DthOperatorId, name: string, tagline: string): OperatorTheme => ({
  ...shared, id, name, tagline, isLightMode: true,
  primaryColor: `var(--operator-${id.replaceAll('_', '-')})`,
  accentColor: `var(--operator-${id.replaceAll('_', '-')})`,
  brandTag: name,
});

export const OPERATOR_THEMES: Record<DthOperatorId, OperatorTheme> = {
  sun_direct: operator("sun_direct", "Sun Direct", "South India’s Premier Digital DTH & Tamil Entertainment Leader"),
  tata_play: operator("tata_play", "Tata Play", "Jingalala Entertainment & Ultra HD Broadcast Experience"),
  airtel_dth: operator("airtel_dth", "Airtel Digital TV", "High Definition Satellite Television & Zero-Buffer Broadcasts"),
  dish_tv: operator("dish_tv", "Dish TV", "Dish TV & D2H Unified Entertainment & Instant Recharge"),
  d2h: operator("d2h", "Dish TV", "Dish TV & D2H Unified Entertainment & Instant Recharge")
};

export function getOperatorTheme(opId: DthOperatorId): OperatorTheme {
  return OPERATOR_THEMES[opId] || OPERATOR_THEMES.sun_direct;
}
