import React from 'react';
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

export const OPERATOR_THEMES: Record<DthOperatorId, OperatorTheme> = {
  sun_direct: {
    id: 'sun_direct',
    name: 'Sun Direct',
    tagline: 'South India’s Premier Digital DTH & Tamil Entertainment Leader',
    isLightMode: true,

    pageBg: 'bg-[#F8F9FA]',
    pageText: 'text-[#1F2937]',
    headingText: 'text-[#111827]',
    subText: 'text-[#374151]',
    mutedText: 'text-[#4B5563]',
    surfaceBorder: 'border-[#E5E7EB]',

    headerBg: 'bg-white/95',
    headerBorder: 'border-[#E5E7EB]',
    statusStripBg: 'bg-[#FFF5F4]',
    statusStripText: 'text-[#992224]',
    statusStripBorder: 'border-[#FED7D5]',
    navContainerBg: 'bg-[#F1F3F5]',
    navContainerBorder: 'border-[#E2E6EA]',
    navActiveBg: 'bg-gradient-to-r from-[#D7231E] to-[#F17508]',
    navActiveText: 'text-white',
    navInactiveText: 'text-[#374151]',
    navInactiveHoverBg: 'hover:bg-gray-200 hover:text-black',

    heroGradient: 'from-[#D7231E] via-[#E43D14] to-[#F17508]',
    heroBorder: 'border-[#D7231E]/20',
    heroTitleColor: 'text-white',
    heroTitleHighlight: 'text-[#FFE58F]',
    heroSubtitleColor: 'text-white/95',
    heroPillBg: 'bg-white/20',
    heroPillText: 'text-white',
    heroPillBorder: 'border-white/30',
    heroBadgeItemBg: 'bg-white/20 backdrop-blur-sm',
    heroBadgeItemText: 'text-white',
    heroBadgeItemBorder: 'border-white/30',

    mainContainerBg: 'bg-[#FFFFFF]',
    mainContainerBorder: 'border-[#E5E7EB]',
    stepNumberBg: 'bg-gradient-to-r from-[#D7231E] to-[#F17508]',
    stepNumberText: 'text-white',
    cardInactiveBg: 'bg-[#FFFFFF]',
    cardInactiveBorder: 'border-[#E5E7EB]',
    cardInactiveText: 'text-[#111827]',
    cardInactiveHoverBorder: 'hover:border-[#D7231E]/40 hover:bg-[#FFFBFB]',
    cardActiveBg: 'bg-[#FFF9F8]',
    cardActiveBorder: 'border-[#D7231E]',
    cardActiveRing: 'ring-2 ring-[#D7231E]/30 shadow-md',
    cardActiveText: 'text-[#111827]',

    // Pack Cards (Step 3: HD, SD, Flexible)
    packHdBandBg: '#D7231E',
    packHdBandText: '#FFFFFF',
    packHdTintBg: 'bg-[#FFF5F4]',
    packHdBorder: 'border-[#D7231E]',

    packSdBandBg: '#F17508',
    packSdBandText: '#111827',
    packSdTintBg: 'bg-[#FFF8F0]',
    packSdBorder: 'border-[#F17508]',

    packFlexibleBandBg: '#992224',
    packFlexibleBandText: '#FFFFFF',
    packFlexibleTintBg: 'bg-[#FDF2F2]',
    packFlexibleBorder: 'border-[#992224]',

    packCardBaseBg: 'bg-white',
    packCardBaseBorder: 'border-[#E5E7EB]',
    packCardHoverBorder: 'hover:border-[#D7231E]/40',
    packCardHoverBg: 'hover:bg-[#FFFBFB]',
    packSelectedBadgeBg: 'bg-white/95',
    packSelectedBadgeText: 'text-[#111827]',
    packSelectedBadgeBorder: 'border-white/80',

    inputBg: 'bg-[#ECEEF2]',
    inputText: 'text-[#111827]',
    inputPlaceholder: 'placeholder-[#6B7280]',
    inputBorder: 'border-[#DEE2E6]',
    inputFocusBorder: 'focus:border-[#D7231E]',
    inputStyleClass: 'rounded-xl px-4 py-3.5 border',

    primaryColor: '#D7231E',
    accentColor: '#F17508',
    ctaButtonClass: 'bg-[#D7231E] hover:bg-[#C01F1B] text-white shadow-md rounded-xl',
    cardButtonActive: 'bg-[#D7231E] text-white shadow-sm',
    cardButtonInactive: 'bg-[#ECEEF2] text-[#1F2937] hover:bg-[#DEE2E6]',
    durationPillContainerBg: 'bg-[#ECEEF2] border-[#DEE2E6]',
    durationPillActive: 'bg-[#D7231E] text-white shadow-sm',
    durationPillInactive: 'text-[#374151] hover:text-[#111827] hover:bg-gray-200',
    badgeBg: 'bg-[#FFF0EF]',
    badgeText: 'text-[#D7231E]',
    badgeBorder: 'border-[#FED7D5]',
    savingsBadgeBg: 'bg-emerald-50',
    savingsBadgeText: 'text-emerald-700',
    savingsBadgeBorder: 'border-emerald-200',

    footerBg: 'bg-[#FFFFFF]',
    footerBorder: 'border-[#E5E7EB]',
    footerText: 'text-[#4B5563]',
    footerLinkHover: 'hover:text-[#D7231E]',

    fontHeadingClass: 'font-sans font-extrabold tracking-tight',
    fontBodyClass: 'font-sans font-normal',
    brandTag: 'Sun Direct Vibrant Red & Orange',
    brandAccentText: 'text-[#D7231E]',
  },

  tata_play: {
    id: 'tata_play',
    name: 'Tata Play',
    tagline: 'Jingalala Entertainment & Ultra HD Broadcast Experience',
    isLightMode: false,

    pageBg: 'bg-[#5500C9]',
    pageText: 'text-white',
    headingText: 'text-white',
    subText: 'text-[#E0D0FF]',
    mutedText: 'text-[#C5B3F6]',
    surfaceBorder: 'border-[#7E28EB]/50',

    headerBg: 'bg-[#140029]/95',
    headerBorder: 'border-[#2D0052]',
    statusStripBg: 'bg-[#1E003D]',
    statusStripText: 'text-[#FF8AC6]',
    statusStripBorder: 'border-[#3B0070]',
    navContainerBg: 'bg-[#290054]/85',
    navContainerBorder: 'border-[#5C0EB0]',
    navActiveBg: 'bg-[#E40066]',
    navActiveText: 'text-white',
    navInactiveText: 'text-[#DDD0FA]',
    navInactiveHoverBg: 'hover:bg-[#3D007A] hover:text-white',

    heroGradient: 'from-[#4B00AA] via-[#5800D6] to-[#6A00EB]',
    heroBorder: 'border-[#8B34FB]/40',
    heroTitleColor: 'text-white',
    heroTitleHighlight: 'text-[#FF2A93]',
    heroSubtitleColor: 'text-white/95',
    heroPillBg: 'bg-[#E40066]/30',
    heroPillText: 'text-white',
    heroPillBorder: 'border-[#E40066]/50',
    heroBadgeItemBg: 'bg-[#E40066] shadow-md',
    heroBadgeItemText: 'text-white font-bold',
    heroBadgeItemBorder: 'border-[#E40066]',

    mainContainerBg: 'bg-[#3D007C]/90 backdrop-blur-md',
    mainContainerBorder: 'border-[#6F1CD4]/60',
    stepNumberBg: 'bg-[#E40066]',
    stepNumberText: 'text-white',
    cardInactiveBg: 'bg-[#4B0094]/75 backdrop-blur-sm',
    cardInactiveBorder: 'border-[#6F1CD4]/50',
    cardInactiveText: 'text-white',
    cardInactiveHoverBorder: 'hover:border-[#E40066] hover:bg-[#5300A4]',
    cardActiveBg: 'bg-[#430087]',
    cardActiveBorder: 'border-[#E40066]',
    cardActiveRing: 'ring-2 ring-[#E40066] shadow-xl shadow-[#E40066]/35',
    cardActiveText: 'text-white',

    // Pack Cards (Step 3: HD, SD, Flexible)
    packHdBandBg: '#E40066',
    packHdBandText: '#FFFFFF',
    packHdTintBg: 'bg-[#480075]',
    packHdBorder: 'border-[#E40066]',

    packSdBandBg: '#6A00EB',
    packSdBandText: '#FFFFFF',
    packSdTintBg: 'bg-[#3F0080]',
    packSdBorder: 'border-[#6A00EB]',

    packFlexibleBandBg: '#3D007A',
    packFlexibleBandText: '#FFFFFF',
    packFlexibleTintBg: 'bg-[#320063]',
    packFlexibleBorder: 'border-[#8B34FB]',

    packCardBaseBg: 'bg-[#290054]/80',
    packCardBaseBorder: 'border-[#5C0EB0]/50',
    packCardHoverBorder: 'hover:border-[#E40066]/60',
    packCardHoverBg: 'hover:bg-[#38006E]',
    packSelectedBadgeBg: 'bg-black/80',
    packSelectedBadgeText: 'text-white',
    packSelectedBadgeBorder: 'border-white/40',

    inputBg: 'bg-[#2E005C]',
    inputText: 'text-white',
    inputPlaceholder: 'placeholder-[#B8A3ED]',
    inputBorder: 'border-[#6F1CD4]',
    inputFocusBorder: 'focus:border-[#E40066] focus:ring-2 focus:ring-[#E40066]/50',
    inputStyleClass: 'rounded-xl px-4 py-3.5 border font-semibold text-white',

    primaryColor: '#E40066',
    accentColor: '#5800D6',
    ctaButtonClass: 'bg-[#E40066] hover:bg-[#C70058] text-white font-bold tracking-wide shadow-lg shadow-[#E40066]/40 rounded-xl transition-all',
    cardButtonActive: 'bg-[#E40066] text-white font-bold shadow-md',
    cardButtonInactive: 'bg-[#34006A] text-white hover:bg-[#46008D] font-semibold border border-[#6F1CD4]/40',
    durationPillContainerBg: 'bg-[#2E005C] border-[#5A10A8]',
    durationPillActive: 'bg-[#E40066] text-white shadow-sm font-bold',
    durationPillInactive: 'text-[#D8C7FF] hover:text-white hover:bg-[#4B0094]',
    badgeBg: 'bg-[#E40066]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#E40066]',
    savingsBadgeBg: 'bg-emerald-950/80',
    savingsBadgeText: 'text-emerald-300',
    savingsBadgeBorder: 'border-emerald-500/40',

    footerBg: 'bg-[#140029]',
    footerBorder: 'border-[#2D0052]',
    footerText: 'text-[#C4BCDB]',
    footerLinkHover: 'hover:text-[#E40066]',

    fontHeadingClass: 'font-sans font-bold tracking-tight',
    fontBodyClass: 'font-sans',
    brandTag: 'Tata Play Royal Purple & Hot Magenta (Official)',
    brandAccentText: 'text-[#E40066]',
  },

  airtel_dth: {
    id: 'airtel_dth',
    name: 'Airtel Digital TV',
    tagline: 'High Definition Satellite Television & Zero-Buffer Broadcasts',
    isLightMode: true,

    pageBg: 'bg-[#F8F9FA]',
    pageText: 'text-[#1F2937]',
    headingText: 'text-[#111827]',
    subText: 'text-[#374151]',
    mutedText: 'text-[#4B5563]',
    surfaceBorder: 'border-[#E5E7EB]',

    headerBg: 'bg-white/95',
    headerBorder: 'border-[#E5E7EB]',
    statusStripBg: 'bg-[#FFF5F5]',
    statusStripText: 'text-[#C51617]',
    statusStripBorder: 'border-[#FED7D7]',
    navContainerBg: 'bg-[#F1F3F5]',
    navContainerBorder: 'border-[#E2E6EA]',
    navActiveBg: 'bg-[#E93031]',
    navActiveText: 'text-white',
    navInactiveText: 'text-[#374151]',
    navInactiveHoverBg: 'hover:bg-gray-200 hover:text-black',

    heroGradient: 'from-[#D41415] via-[#E93031] to-[#FF3B30]',
    heroBorder: 'border-[#E93031]/25',
    heroTitleColor: 'text-white',
    heroTitleHighlight: 'text-[#FFF275]',
    heroSubtitleColor: 'text-white/95',
    heroPillBg: 'bg-white/20 backdrop-blur-sm',
    heroPillText: 'text-white',
    heroPillBorder: 'border-white/30',
    heroBadgeItemBg: 'bg-white/20 backdrop-blur-sm',
    heroBadgeItemText: 'text-white',
    heroBadgeItemBorder: 'border-white/30',

    mainContainerBg: 'bg-[#FFFFFF]',
    mainContainerBorder: 'border-[#E5E7EB]',
    stepNumberBg: 'bg-[#E93031]',
    stepNumberText: 'text-white',
    cardInactiveBg: 'bg-[#FFFFFF]',
    cardInactiveBorder: 'border-[#E5E7EB]',
    cardInactiveText: 'text-[#111827]',
    cardInactiveHoverBorder: 'hover:border-[#E93031]/50 hover:shadow-md hover:bg-[#FFFBFB]',
    cardActiveBg: 'bg-[#FFF8F8]',
    cardActiveBorder: 'border-[#E93031]',
    cardActiveRing: 'ring-2 ring-[#E93031]/30 shadow-md',
    cardActiveText: 'text-[#111827]',

    // Pack Cards (Step 3: HD, SD, Flexible)
    packHdBandBg: '#E93031',
    packHdBandText: '#FFFFFF',
    packHdTintBg: 'bg-[#FFF5F5]',
    packHdBorder: 'border-[#E93031]',

    packSdBandBg: '#B51213',
    packSdBandText: '#FFFFFF',
    packSdTintBg: 'bg-[#FDF2F2]',
    packSdBorder: 'border-[#B51213]',

    packFlexibleBandBg: '#700C0D',
    packFlexibleBandText: '#FFFFFF',
    packFlexibleTintBg: 'bg-[#FAF0F0]',
    packFlexibleBorder: 'border-[#700C0D]',

    packCardBaseBg: 'bg-white',
    packCardBaseBorder: 'border-[#E5E7EB]',
    packCardHoverBorder: 'hover:border-[#E93031]/40',
    packCardHoverBg: 'hover:bg-[#FFFBFB]',
    packSelectedBadgeBg: 'bg-white/95',
    packSelectedBadgeText: 'text-[#111827]',
    packSelectedBadgeBorder: 'border-white/80',

    inputBg: 'bg-[#F1F3F5]',
    inputText: 'text-[#111827]',
    inputPlaceholder: 'placeholder-[#6B7280]',
    inputBorder: 'border-[#DEE2E6]',
    inputFocusBorder: 'focus:border-[#E93031] focus:ring-1 focus:ring-[#E93031]/30',
    inputStyleClass: 'rounded-xl px-4 py-3.5 border font-semibold transition-all',

    primaryColor: '#E93031',
    accentColor: '#B51213',
    ctaButtonClass: 'bg-[#E93031] hover:bg-[#D42223] text-white font-bold tracking-wide shadow-md shadow-[#E93031]/25 rounded-xl',
    cardButtonActive: 'bg-[#E93031] text-white font-bold rounded-xl shadow-sm',
    cardButtonInactive: 'bg-[#F1F3F5] text-[#1F2937] hover:bg-[#E2E6EA] rounded-xl font-semibold',
    durationPillContainerBg: 'bg-[#F1F3F5] border-[#DEE2E6]',
    durationPillActive: 'bg-[#E93031] text-white shadow-sm font-bold',
    durationPillInactive: 'text-[#374151] hover:text-[#111827] hover:bg-gray-200',
    badgeBg: 'bg-[#FFF0EF]',
    badgeText: 'text-[#E93031]',
    badgeBorder: 'border-[#FED7D5]',
    savingsBadgeBg: 'bg-emerald-50',
    savingsBadgeText: 'text-emerald-700',
    savingsBadgeBorder: 'border-emerald-200',

    footerBg: 'bg-[#1C1C1E]',
    footerBorder: 'border-[#2C2C2E]',
    footerText: 'text-[#D1D5DB]',
    footerLinkHover: 'hover:text-[#E93031]',

    fontHeadingClass: 'font-sans font-extrabold tracking-tight',
    fontBodyClass: 'font-sans font-normal',
    brandTag: 'Airtel Digital TV Red (Official)',
    brandAccentText: 'text-[#E93031]',
  },

  dish_tv: {
    id: 'dish_tv',
    name: 'Dish TV',
    tagline: 'Dish TV & D2H Unified Entertainment & Instant Recharge',
    isLightMode: true,

    pageBg: 'bg-[#F9FAFB]',
    pageText: 'text-[#1F2937]',
    headingText: 'text-[#111827]',
    subText: 'text-[#374151]',
    mutedText: 'text-[#4B5563]',
    surfaceBorder: 'border-[#E5E7EB]',

    headerBg: 'bg-[#FFFFFF]/98',
    headerBorder: 'border-[#E5E7EB]',
    statusStripBg: 'bg-[#FFF7ED]',
    statusStripText: 'text-[#9A3412]',
    statusStripBorder: 'border-[#FFEDD5]',
    navContainerBg: 'bg-[#F3F4F6]',
    navContainerBorder: 'border-[#E5E7EB]',
    navActiveBg: 'bg-[#EB5B26]',
    navActiveText: 'text-white',
    navInactiveText: 'text-[#374151]',
    navInactiveHoverBg: 'hover:bg-gray-200 hover:text-black',

    heroGradient: 'from-[#EB5B26] via-[#852C58] to-[#2B1D53]',
    heroBorder: 'border-[#EB5B26]/20',
    heroTitleColor: 'text-white',
    heroTitleHighlight: 'text-[#FFE58F]',
    heroSubtitleColor: 'text-white/95',
    heroPillBg: 'bg-white/20',
    heroPillText: 'text-white',
    heroPillBorder: 'border-white/30',
    heroBadgeItemBg: 'bg-white/20 backdrop-blur-sm',
    heroBadgeItemText: 'text-white',
    heroBadgeItemBorder: 'border-white/30',

    mainContainerBg: 'bg-[#FFFFFF]',
    mainContainerBorder: 'border-[#E5E7EB]',
    stepNumberBg: 'bg-[#EB5B26]',
    stepNumberText: 'text-white',
    cardInactiveBg: 'bg-[#FFFFFF]',
    cardInactiveBorder: 'border-[#E5E7EB]',
    cardInactiveText: 'text-[#111827]',
    cardInactiveHoverBorder: 'hover:border-[#EB5B26]/50 hover:bg-[#FFFBF7]',
    cardActiveBg: 'bg-[#FFF9F6]',
    cardActiveBorder: 'border-[#EB5B26]',
    cardActiveRing: 'ring-2 ring-[#EB5B26]/30 shadow-md',
    cardActiveText: 'text-[#111827]',

    // Pack Cards (Step 3: HD, SD, Flexible)
    packHdBandBg: '#EB5B26',
    packHdBandText: '#FFFFFF',
    packHdTintBg: 'bg-[#FFF7ED]',
    packHdBorder: 'border-[#EB5B26]',

    packSdBandBg: '#852C58',
    packSdBandText: '#FFFFFF',
    packSdTintBg: 'bg-[#FDF4F8]',
    packSdBorder: 'border-[#852C58]',

    packFlexibleBandBg: '#2B1D53',
    packFlexibleBandText: '#FFFFFF',
    packFlexibleTintBg: 'bg-[#F5F3FA]',
    packFlexibleBorder: 'border-[#2B1D53]',

    packCardBaseBg: 'bg-white',
    packCardBaseBorder: 'border-[#E5E7EB]',
    packCardHoverBorder: 'hover:border-[#EB5B26]/40',
    packCardHoverBg: 'hover:bg-[#FFFBF7]',
    packSelectedBadgeBg: 'bg-white/95',
    packSelectedBadgeText: 'text-[#111827]',
    packSelectedBadgeBorder: 'border-white/80',

    inputBg: 'bg-[#F3F4F6]',
    inputText: 'text-[#111827]',
    inputPlaceholder: 'placeholder-[#6B7280]',
    inputBorder: 'border-[#D1D5DB]',
    inputFocusBorder: 'focus:border-[#EB5B26]',
    inputStyleClass: 'rounded-xl px-4 py-3.5 border font-semibold',

    primaryColor: '#EB5B26',
    accentColor: '#2B1D53',
    ctaButtonClass: 'bg-[#EB5B26] hover:bg-[#D44714] text-white font-bold tracking-wide shadow-md rounded-xl',
    cardButtonActive: 'bg-[#EB5B26] text-white font-bold text-xs shadow-sm',
    cardButtonInactive: 'bg-[#F3F4F6] text-[#1F2937] hover:bg-[#E5E7EB] font-semibold',
    durationPillContainerBg: 'bg-[#F3F4F6] border-[#E5E7EB]',
    durationPillActive: 'bg-[#EB5B26] text-white shadow-sm font-bold',
    durationPillInactive: 'text-[#374151] hover:text-[#111827] hover:bg-gray-200',
    badgeBg: 'bg-[#FFF7ED]',
    badgeText: 'text-[#EB5B26]',
    badgeBorder: 'border-[#FFEDD5]',
    savingsBadgeBg: 'bg-emerald-50',
    savingsBadgeText: 'text-emerald-700',
    savingsBadgeBorder: 'border-emerald-200',

    footerBg: 'bg-[#FFFFFF]',
    footerBorder: 'border-[#E5E7EB]',
    footerText: 'text-[#4B5563]',
    footerLinkHover: 'hover:text-[#EB5B26]',

    fontHeadingClass: 'font-sans font-extrabold tracking-tight',
    fontBodyClass: 'font-sans font-normal',
    brandTag: 'Dish TV & D2H Flame Orange & Deep Indigo',
    brandAccentText: 'text-[#EB5B26]',
  },

  d2h: {
    id: 'd2h',
    name: 'Dish TV',
    tagline: 'Dish TV & D2H Unified Entertainment & Instant Recharge',
    isLightMode: true,

    pageBg: 'bg-[#F9FAFB]',
    pageText: 'text-[#1F2937]',
    headingText: 'text-[#111827]',
    subText: 'text-[#374151]',
    mutedText: 'text-[#4B5563]',
    surfaceBorder: 'border-[#E5E7EB]',

    headerBg: 'bg-[#FFFFFF]/98',
    headerBorder: 'border-[#E5E7EB]',
    statusStripBg: 'bg-[#FFF7ED]',
    statusStripText: 'text-[#9A3412]',
    statusStripBorder: 'border-[#FFEDD5]',
    navContainerBg: 'bg-[#F3F4F6]',
    navContainerBorder: 'border-[#E5E7EB]',
    navActiveBg: 'bg-[#EB5B26]',
    navActiveText: 'text-white',
    navInactiveText: 'text-[#374151]',
    navInactiveHoverBg: 'hover:bg-gray-200 hover:text-black',

    heroGradient: 'from-[#EB5B26] via-[#852C58] to-[#2B1D53]',
    heroBorder: 'border-[#EB5B26]/20',
    heroTitleColor: 'text-white',
    heroTitleHighlight: 'text-[#FFE58F]',
    heroSubtitleColor: 'text-white/95',
    heroPillBg: 'bg-white/20',
    heroPillText: 'text-white',
    heroPillBorder: 'border-white/30',
    heroBadgeItemBg: 'bg-white/20 backdrop-blur-sm',
    heroBadgeItemText: 'text-white',
    heroBadgeItemBorder: 'border-white/30',

    mainContainerBg: 'bg-[#FFFFFF]',
    mainContainerBorder: 'border-[#E5E7EB]',
    stepNumberBg: 'bg-[#EB5B26]',
    stepNumberText: 'text-white',
    cardInactiveBg: 'bg-[#FFFFFF]',
    cardInactiveBorder: 'border-[#E5E7EB]',
    cardInactiveText: 'text-[#111827]',
    cardInactiveHoverBorder: 'hover:border-[#EB5B26]/50 hover:bg-[#FFFBF7]',
    cardActiveBg: 'bg-[#FFF9F6]',
    cardActiveBorder: 'border-[#EB5B26]',
    cardActiveRing: 'ring-2 ring-[#EB5B26]/30 shadow-md',
    cardActiveText: 'text-[#111827]',

    // Pack Cards (Step 3: HD, SD, Flexible)
    packHdBandBg: '#EB5B26',
    packHdBandText: '#FFFFFF',
    packHdTintBg: 'bg-[#FFF7ED]',
    packHdBorder: 'border-[#EB5B26]',

    packSdBandBg: '#852C58',
    packSdBandText: '#FFFFFF',
    packSdTintBg: 'bg-[#FDF4F8]',
    packSdBorder: 'border-[#852C58]',

    packFlexibleBandBg: '#2B1D53',
    packFlexibleBandText: '#FFFFFF',
    packFlexibleTintBg: 'bg-[#F5F3FA]',
    packFlexibleBorder: 'border-[#2B1D53]',

    packCardBaseBg: 'bg-white',
    packCardBaseBorder: 'border-[#E5E7EB]',
    packCardHoverBorder: 'hover:border-[#EB5B26]/40',
    packCardHoverBg: 'hover:bg-[#FFFBF7]',
    packSelectedBadgeBg: 'bg-white/95',
    packSelectedBadgeText: 'text-[#111827]',
    packSelectedBadgeBorder: 'border-white/80',

    inputBg: 'bg-[#F3F4F6]',
    inputText: 'text-[#111827]',
    inputPlaceholder: 'placeholder-[#6B7280]',
    inputBorder: 'border-[#D1D5DB]',
    inputFocusBorder: 'focus:border-[#EB5B26]',
    inputStyleClass: 'rounded-xl px-4 py-3.5 border font-semibold',

    primaryColor: '#EB5B26',
    accentColor: '#2B1D53',
    ctaButtonClass: 'bg-[#EB5B26] hover:bg-[#D44714] text-white font-bold tracking-wide shadow-md rounded-xl',
    cardButtonActive: 'bg-[#EB5B26] text-white font-bold text-xs shadow-sm',
    cardButtonInactive: 'bg-[#F3F4F6] text-[#1F2937] hover:bg-[#E5E7EB] font-semibold',
    durationPillContainerBg: 'bg-[#F3F4F6] border-[#E5E7EB]',
    durationPillActive: 'bg-[#EB5B26] text-white shadow-sm font-bold',
    durationPillInactive: 'text-[#374151] hover:text-[#111827] hover:bg-gray-200',
    badgeBg: 'bg-[#FFF7ED]',
    badgeText: 'text-[#EB5B26]',
    badgeBorder: 'border-[#FFEDD5]',
    savingsBadgeBg: 'bg-emerald-50',
    savingsBadgeText: 'text-emerald-700',
    savingsBadgeBorder: 'border-emerald-200',

    footerBg: 'bg-[#FFFFFF]',
    footerBorder: 'border-[#E5E7EB]',
    footerText: 'text-[#4B5563]',
    footerLinkHover: 'hover:text-[#EB5B26]',

    fontHeadingClass: 'font-sans font-extrabold tracking-tight',
    fontBodyClass: 'font-sans font-normal',
    brandTag: 'Dish TV & D2H Flame Orange & Deep Indigo',
    brandAccentText: 'text-[#EB5B26]',
  },
};

export function getOperatorTheme(opId: DthOperatorId): OperatorTheme {
  return OPERATOR_THEMES[opId] || OPERATOR_THEMES.sun_direct;
}
