import React, { useState } from 'react';
import { DthOperatorId } from '../types';
import { OperatorTheme } from '../lib/theme';

interface BrandLogoProps {
  theme: OperatorTheme;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ theme, className = '', size = 'md' }) => {
  const isAirtel = theme.id === 'airtel_dth';
  const isSunDirect = theme.id === 'sun_direct';
  const isTataPlay = theme.id === 'tata_play';
  const isDishTv = theme.id === 'dish_tv' || theme.id === 'd2h';

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }[size];

  if (isAirtel) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Airtel Iconic lowercase red 'a' emblem */}
        <div className={`${sizeClasses} rounded-xl bg-[#E93031] text-white flex items-center justify-center font-black shadow-md`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 3C7.029 3 3 7.029 3 12c0 3.12 1.603 5.86 4.025 7.45-.14-.52-.225-1.07-.225-1.65 0-3.314 2.686-6 6-6s6 2.686 6 6c0 .58-.085 1.13-.225 1.65C20.397 17.86 22 15.12 22 12c0-4.971-4.029-9-9-9zm.8 9.5c-1.546 0-2.8 1.254-2.8 2.8 0 1.546 1.254 2.8 2.8 2.8 1.546 0 2.8-1.254 2.8-2.8 0-1.546-1.254-2.8-2.8-2.8z" />
          </svg>
        </div>
        <div>
          <span className="font-black tracking-tight text-lg text-[#000000] block leading-none">
            airtel <span className="text-[#E93031] font-bold">DTH</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#666666] block mt-0.5">
            Digital TV
          </span>
        </div>
      </div>
    );
  }

  if (isTataPlay) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Tata Play Iconic Magenta & Purple Emblem */}
        <div className={`${sizeClasses} rounded-xl bg-[#E40066] text-white flex items-center justify-center shadow-lg border border-white/20`}>
          <div className="font-black text-xs tracking-tighter flex items-center">
            <span>PL</span>
            <span className="text-white text-[10px] mx-px">▶</span>
            <span>Y</span>
          </div>
        </div>
        <div>
          <span className="font-black tracking-tight text-lg text-white block leading-none">
            TATA <span className="text-[#FF2A93]">PLAY</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#DDD0FA] block mt-0.5">
            Jingalala DTH
          </span>
        </div>
      </div>
    );
  }

  if (isDishTv) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Dish TV Smile Curve Emblem */}
        <div className={`${sizeClasses} rounded-xl bg-gradient-to-br from-[#F7941D] to-[#FFB81C] text-[#080d1a] flex items-center justify-center shadow-md border border-[#F7941D]/50`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#080d1a]">
            <path d="M12 4a8 8 0 0 0-8 8c0 2.2.9 4.2 2.3 5.7l1.4-1.4A6 6 0 0 1 6 12a6 6 0 0 1 12 0 6 6 0 0 1-1.7 4.3l1.4 1.4A8 8 0 0 0 20 12a8 8 0 0 0-8-8zm-4 8a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" />
          </svg>
        </div>
        <div>
          <span className="font-black tracking-tight text-lg text-white block leading-none">
            dish<span className="text-[#FFB81C]">tv</span> <span className="text-xs font-bold text-[#60a5fa]">& d2h</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#cfb597] block mt-0.5">
            Direct Broadcast
          </span>
        </div>
      </div>
    );
  }

  // Default Sun Direct
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Sun Direct Sunburst Emblem */}
      <div className={`${sizeClasses} rounded-xl bg-gradient-to-br from-[#E4292C] to-[#F26522] text-white flex items-center justify-center shadow-md border border-[#F26522]/50`}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <span className="font-black tracking-tight text-lg text-white block leading-none">
          SUN <span className="text-[#ff6b57]">DIRECT</span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#cfa4a2] block mt-0.5">
          Digital DTH
        </span>
      </div>
    </div>
  );
};

// Official Operator Card Logo for selector buttons
export const OperatorCardLogo: React.FC<{ operatorId: DthOperatorId; className?: string }> = ({
  operatorId,
  className = 'h-7 sm:h-8 max-w-[85px] sm:max-w-[95px] object-contain mx-auto',
}) => {
  const [candidateIdx, setCandidateIdx] = useState(0);

  const logoCandidates: Record<DthOperatorId, string[]> = {
    sun_direct: ['/assets/sun_logo.png', '/sun_logo.png'],
    airtel_dth: ['/assets/airtel_logo.png', '/airtel_logo.png'],
    tata_play: ['/assets/tata_logo.png', '/tata_logo.png'],
    dish_tv: ['/assets/dishtv_logo.png', '/dishtv_logo.png'],
    d2h: ['/assets/dishtv_logo.png', '/dishtv_logo.png'],
  };

  const candidates = logoCandidates[operatorId] || logoCandidates.sun_direct;
  const hasCandidate = candidateIdx < candidates.length;

  if (!hasCandidate) {
    return (
      <div className="h-8 sm:h-9 px-2.5 mx-auto rounded-xl bg-white/95 shadow-sm border border-slate-200/80 flex items-center justify-center text-center font-black text-xs">
        {operatorId === 'airtel_dth' && <span className="text-[#E93031]">airtel</span>}
        {operatorId === 'tata_play' && <span className="text-[#E40066]">TATA PLAY</span>}
        {(operatorId === 'dish_tv' || operatorId === 'd2h') && <span className="text-[#F7941D]">dish tv</span>}
        {operatorId === 'sun_direct' && <span className="text-[#F26522]">SUN DIRECT</span>}
      </div>
    );
  }

  return (
    <div className="h-9 sm:h-10 px-3 mx-auto bg-white rounded-xl shadow-sm border border-slate-200/90 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
      <img
        src={candidates[candidateIdx]}
        alt={`${operatorId} logo`}
        referrerPolicy="no-referrer"
        onError={() => setCandidateIdx((prev) => prev + 1)}
        className={className}
      />
    </div>
  );
};

// Reusable Operator Hero Image with graceful fallbacks
interface OperatorHeroImageProps {
  candidates: string[];
  alt: string;
  fallbackSvg: React.ReactNode;
  containerClassName?: string;
  imgClassName?: string;
}

export const OperatorHeroImage: React.FC<OperatorHeroImageProps> = ({
  candidates,
  alt,
  fallbackSvg,
  containerClassName = "relative w-60 sm:w-72 md:w-96 h-48 sm:h-56 md:h-64 flex items-center justify-center",
  imgClassName = "w-full h-full object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105",
}) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const hasCandidate = candidateIndex < candidates.length;

  return (
    <div className="pointer-events-none hidden sm:flex items-center justify-center pr-2 md:pr-4">
      <div className={containerClassName}>
        {hasCandidate ? (
          <img
            src={candidates[candidateIndex]}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => {
              setCandidateIndex((prev) => prev + 1);
            }}
            className={imgClassName}
          />
        ) : (
          fallbackSvg
        )}
      </div>
    </div>
  );
};

// Sun Direct Dish, STB & Remote setup component
export const SunDirectHeroBannerGraphic: React.FC = () => {
  return (
    <OperatorHeroImage
      candidates={['/assets/sun_direct_hero.png', '/sun_direct_hero.png']}
      alt="Sun Direct HD Dish, Set-Top Box & Remote"
      fallbackSvg={
        <svg viewBox="0 0 320 260" className="w-full h-full drop-shadow-2xl" fill="none">
          <defs>
            <radialGradient id="sun-hero-brush-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5B289" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#EDB087" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#E08B58" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dish-metallic-grad" x1="20%" y1="10%" x2="80%" y2="90%">
              <stop offset="0%" stopColor="#2A2D34" />
              <stop offset="50%" stopColor="#181A1F" />
              <stop offset="100%" stopColor="#0B0C0E" />
            </linearGradient>
            <linearGradient id="stb-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B3F48" />
              <stop offset="25%" stopColor="#24272E" />
              <stop offset="100%" stopColor="#111317" />
            </linearGradient>
            <linearGradient id="remote-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2C3038" />
              <stop offset="100%" stopColor="#101216" />
            </linearGradient>
          </defs>
          <path
            d="M 40 120 C 20 70 80 30 160 25 C 240 20 300 65 295 130 C 290 195 245 235 160 240 C 75 245 50 170 40 120 Z"
            fill="url(#sun-hero-brush-grad)"
          />
          <g transform="translate(75, 40)">
            <ellipse cx="80" cy="80" rx="68" ry="68" fill="url(#dish-metallic-grad)" stroke="#474C56" strokeWidth="2" />
            <ellipse cx="80" cy="80" rx="65" ry="65" fill="#15171C" fillOpacity="0.85" />
            <g transform="translate(36, 60)">
              <text x="0" y="16" fill="#FFFFFF" fontSize="16" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">SUN</text>
              <text x="0" y="27" fill="#FFFFFF" fontSize="9" fontWeight="800" fontFamily="sans-serif" letterSpacing="1.5">DIRECT</text>
              <rect x="42" y="5" width="4" height="22" fill="#F26522" rx="1" />
              <text x="50" y="27" fill="#FFFFFF" fontSize="28" fontWeight="900" fontStyle="italic" fontFamily="sans-serif">HD</text>
            </g>
            <path d="M 80 115 L 125 105" stroke="#1A1D24" strokeWidth="6" strokeLinecap="round" />
            <rect x="120" y="98" width="16" height="14" rx="3" fill="#2E333D" stroke="#505663" strokeWidth="1" />
            <circle cx="128" cy="105" r="3" fill="#111317" />
          </g>
          <g transform="translate(68, 115)">
            <rect x="0" y="0" width="24" height="85" rx="6" fill="url(#remote-grad)" stroke="#4A505E" strokeWidth="1.2" />
            <circle cx="18" cy="8" r="2.5" fill="#E4292C" />
          </g>
          <g transform="translate(90, 160)">
            <rect x="0" y="5" width="155" height="38" rx="7" fill="#000000" fillOpacity="0.4" />
            <rect x="0" y="0" width="155" height="36" rx="6" fill="url(#stb-body-grad)" stroke="#4A505E" strokeWidth="1.2" />
            <rect x="3" y="10" width="149" height="23" rx="4" fill="#0D0E12" stroke="#2D313A" strokeWidth="1" />
            <rect x="12" y="13" width="22" height="10" rx="1.5" fill="#FFFFFF" />
            <g transform="translate(14, 15)">
              <text x="0" y="5" fill="#E4292C" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">SUN</text>
              <text x="0" y="8" fill="#F26522" fontSize="2.8" fontWeight="800" fontFamily="sans-serif">DIRECT</text>
            </g>
            <circle cx="85" cy="21" r="1.5" fill="#10B981" />
            <circle cx="92" cy="21" r="1.5" fill="#EF4444" />
          </g>
        </svg>
      }
    />
  );
};

// Airtel Digital TV setup component
export const AirtelHeroBannerGraphic: React.FC = () => {
  return (
    <OperatorHeroImage
      candidates={['/assets/airtel_hero.png', '/airtel_hero.png']}
      alt="Airtel Digital TV Setup"
      containerClassName="relative w-44 sm:w-56 md:w-72 h-36 sm:h-44 md:h-52 flex items-center justify-center"
      imgClassName="w-[82%] h-[82%] object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
      fallbackSvg={
        <div className="opacity-25 flex items-center pr-6">
          <svg viewBox="0 0 220 200" className="w-48 h-40 text-white" fill="none">
            <rect x="25" y="35" width="150" height="100" rx="12" stroke="white" strokeWidth="3.5" />
            <line x1="25" y1="105" x2="175" y2="105" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
            <path d="M75 160 L125 160" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M100 135 L100 160" stroke="white" strokeWidth="3.5" />
            <circle cx="100" cy="70" r="22" stroke="white" strokeWidth="2.5" fill="white" fillOpacity="0.1" />
            <polygon points="95,60 112,70 95,80" fill="white" />
          </svg>
        </div>
      }
    />
  );
};

// Tata Play setup component
export const TataPlayHeroBannerGraphic: React.FC = () => {
  return (
    <OperatorHeroImage
      candidates={['/assets/tata_play_hero.png', '/tata_play_hero.png']}
      alt="Tata Play Setup"
      fallbackSvg={
        <div className="opacity-90 flex items-center pr-2 md:pr-6">
          <svg viewBox="0 0 240 200" className="w-64 h-56" fill="none">
            <g transform="translate(45, 15)">
              <text x="0" y="38" fill="#FFFFFF" fontSize="38" fontWeight="900" fontFamily="sans-serif" letterSpacing="-1">PL</text>
              <polygon points="52,10 74,25 52,40" fill="#E40066" />
              <text x="80" y="38" fill="#FFFFFF" fontSize="38" fontWeight="900" fontFamily="sans-serif" letterSpacing="-1">Y</text>
            </g>
          </svg>
        </div>
      }
    />
  );
};

// Dish TV / d2h setup component
export const DishTvHeroBannerGraphic: React.FC = () => {
  return (
    <OperatorHeroImage
      candidates={['/assets/dish_hero.png', '/dish_hero.png']}
      alt="Dish TV & d2h Setup"
      fallbackSvg={
        <div className="opacity-35 flex items-center pr-4">
          <svg viewBox="0 0 240 200" className="w-64 h-56" fill="none">
            <polygon points="10,10 230,10 180,190 60,190" fill="white" fillOpacity="0.1" />
          </svg>
        </div>
      }
    />
  );
};

export const HeroIllustrativeGraphic: React.FC<{ theme: OperatorTheme }> = ({ theme }) => {
  if (theme.id === 'airtel_dth') {
    return <AirtelHeroBannerGraphic />;
  }

  if (theme.id === 'tata_play') {
    return <TataPlayHeroBannerGraphic />;
  }

  if (theme.id === 'dish_tv' || theme.id === 'd2h') {
    return <DishTvHeroBannerGraphic />;
  }

  return <SunDirectHeroBannerGraphic />;
};
