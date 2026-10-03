import React, { useState } from 'react';
import { 
  Tv, 
  Plus, 
  Trash2, 
  Zap, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  CreditCard,
  X,
  Sparkles
} from 'lucide-react';
import { DthConnection, DthOperatorId, Language, UserProfile } from '../types';
import { translations } from '../lib/translations';
import { OperatorTheme, getOperatorTheme } from '../lib/theme';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface SavedConnectionsProps {
  connections: DthConnection[];
  currentLang: Language;
  user: UserProfile | null;
  onQuickRecharge: (conn: DthConnection) => void;
  onTriggerRefresh: (operator: DthOperatorId, card: string) => void;
  onAddConnection: (conn: Omit<DthConnection, 'id' | 'createdAt'>) => void;
  onDeleteConnection: (id: string) => void;
  onOpenAuth: () => void;
  currentTheme: OperatorTheme;
}

export const SavedConnections: React.FC<SavedConnectionsProps> = ({
  connections,
  currentLang,
  user,
  onQuickRecharge,
  onTriggerRefresh,
  onAddConnection,
  onDeleteConnection,
  onOpenAuth,
  currentTheme,
}) => {
  const t = translations[currentLang];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [operator, setOperator] = useState<DthOperatorId>('sun_direct');
  const [smartCard, setSmartCard] = useState('');
  const [nickname, setNickname] = useState('Home Hall');
  const [customerName, setCustomerName] = useState('');

  const isLight = currentTheme.isLightMode;

  const { modalRef } = useAccessibleModal({
    isOpen: isAddOpen,
    onClose: () => setIsAddOpen(false),
  });

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartCard) return;

    const opNames: Record<DthOperatorId, string> = {
      sun_direct: 'Sun Direct',
      tata_play: 'Tata Play',
      airtel_dth: 'Airtel Digital TV',
      dish_tv: 'Dish TV',
      d2h: 'Dish TV', // Merged
    };

    onAddConnection({
      user_id: user?.uid || 'guest_user',
      operator: operator === 'd2h' ? 'dish_tv' : operator,
      operatorName: opNames[operator] || 'Dish TV',
      smartCardNumber: smartCard.trim().replace(/\s+/g, ''),
      nickname: nickname || 'Living Room DTH',
      customerName: customerName || 'Account Holder',
      balance: 45.0,
      expiryDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      monthlyPackPrice: 219,
      packName: operator === 'sun_direct' ? 'Tamil Super Pack' : 'Tamil Entertainment',
    });

    setIsAddOpen(false);
    setSmartCard('');
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Header Bar Themed */}
      <div 
        className={`${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} border p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors duration-300`}
      >
        <div className="space-y-1 max-w-xl">
          <h2 className={`text-xl font-bold flex items-center gap-2.5 ${currentTheme.headingText} ${currentTheme.fontHeadingClass}`}>
            <div 
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-white border-gray-300' : 'bg-black/30 border-white/10'
              }`}
              style={{ borderColor: `${currentTheme.primaryColor}50` }}
            >
              <Tv className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
            </div>
            <span>{t.myConnectionsTitle}</span>
          </h2>
          <p className={`text-xs ${currentTheme.subText}`}>
            {currentLang === 'ta'
              ? 'உங்கள் வீட்டில் உள்ள அனைத்து செட்-டாப் பாக்ஸ்களையும் நிர்வகிக்கவும் மற்றும் 1-கிளிக் ரீசார்ஜ் செய்யவும்.'
              : 'Manage your saved Set-Top Boxes for fast recharges and signal refresh.'}
          </p>
        </div>

        <button
          id="add-connection-btn"
          onClick={() => {
            if (!user) {
              onOpenAuth();
            } else {
              setIsAddOpen(true);
            }
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${currentTheme.ctaButtonClass}`}
        >
          <Plus className="w-4 h-4" />
          <span>{t.addConnection}</span>
        </button>
      </div>

      {/* Cards Grid */}
      {connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {connections.map((conn) => {
            const normalizedOp = conn.operator === 'd2h' ? 'dish_tv' : conn.operator;
            const opTheme = getOperatorTheme(normalizedOp);

            return (
              <div
                key={conn.id}
                className={`${currentTheme.cardInactiveBg} ${currentTheme.cardInactiveBorder} border hover:border-[${opTheme.primaryColor}]/60 rounded-3xl p-5 shadow-lg space-y-4 relative group transition-all duration-200 flex flex-col justify-between`}
              >
                <div>
                  {/* Card Header with Specific Operator Badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span 
                        className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${opTheme.primaryColor}15`,
                          color: opTheme.primaryColor,
                          borderColor: `${opTheme.primaryColor}30`,
                        }}
                      >
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: opTheme.primaryColor }} 
                        />
                        {conn.operatorName}
                      </span>
                      <h3 className={`font-bold text-base mt-2 ${currentTheme.headingText}`}>
                        {conn.nickname}
                      </h3>
                      <p className={`text-xs font-mono mt-0.5 ${currentTheme.mutedText}`}>
                        <strong className={currentTheme.headingText}>{conn.smartCardNumber}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => onDeleteConnection(conn.id)}
                      className={`p-2 rounded-xl transition-colors text-rose-500 hover:bg-rose-500/10`}
                      title="Remove Connection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Account Meta Balance & Expiry */}
                  <div className={`mt-4 ${currentTheme.inputBg} p-3.5 rounded-2xl border ${currentTheme.inputBorder} grid grid-cols-2 gap-2 text-xs`}>
                    <div>
                      <span className={`text-xs font-semibold block ${currentTheme.mutedText}`}>Balance</span>
                      <span className="font-extrabold tabular-nums tracking-tight text-base" style={{ color: opTheme.primaryColor }}>
                        ₹{conn.balance?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div>
                      <span className={`text-xs font-semibold block ${currentTheme.mutedText}`}>Expiry</span>
                      <span className={`font-mono font-medium text-xs block mt-1 ${currentTheme.subText}`}>
                        {conn.expiryDate || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {conn.packName && (
                    <div className={`mt-3 text-xs flex items-center justify-between px-1`}>
                      <span className={currentTheme.mutedText}>Pack:</span>
                      <span className="font-bold font-mono" style={{ color: opTheme.primaryColor }}>
                        {conn.packName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions (Recharge & Signal Refresh) */}
                <div className={`flex items-center gap-2 pt-3 border-t ${currentTheme.surfaceBorder}`}>
                  <button
                    onClick={() => onQuickRecharge(conn)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${currentTheme.cardButtonActive}`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{t.rechargeAgain}</span>
                  </button>

                  <button
                    onClick={() => onTriggerRefresh(normalizedOp, conn.smartCardNumber)}
                    className={`p-2.5 rounded-xl transition-colors border flex items-center justify-center ${currentTheme.cardButtonInactive} ${currentTheme.inputBorder}`}
                    title="Refresh Signal"
                  >
                    <Radio className="w-4 h-4" style={{ color: opTheme.primaryColor }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} border border-dashed rounded-3xl p-12 text-center space-y-4 shadow-sm`}>
          <div 
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border`}
            style={{ 
              backgroundColor: `${currentTheme.primaryColor}15`,
              borderColor: `${currentTheme.primaryColor}30`
            }}
          >
            <Tv className="w-8 h-8" style={{ color: currentTheme.primaryColor }} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className={`font-bold text-base ${currentTheme.headingText}`}>
              No Saved Set-Top Boxes
            </h3>
            <p className={`text-xs ${currentTheme.subText}`}>
              {t.noConnections}
            </p>
          </div>
          <button
            onClick={() => {
              if (!user) {
                onOpenAuth();
              } else {
                setIsAddOpen(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all shadow-md ${currentTheme.ctaButtonClass}`}
          >
            <Plus className="w-4 h-4" />
            <span>{t.addFirstBox}</span>
          </button>
        </div>
      )}

      {/* Add Connection Modal Themed */}
      {isAddOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
        >
          <div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-box-modal-title"
            tabIndex={-1}
            className={`${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative space-y-5`}
          >
            <div className={`flex items-center justify-between border-b ${currentTheme.surfaceBorder} pb-3.5`}>
              <h3 id="add-box-modal-title" className={`font-bold text-base flex items-center gap-2 ${currentTheme.headingText}`}>
                <Plus className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                <span>{t.addSetTopBox}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label={t.close}
                className={`p-1.5 rounded-lg hover:bg-gray-500/10 ${currentTheme.subText}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4 text-xs">
              <div>
                <label className={`block font-semibold mb-1.5 ${currentTheme.subText}`}>
                  {t.dthOperatorLabel}
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as DthOperatorId)}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} rounded-xl px-3.5 py-2.5 font-medium focus:outline-none border transition-colors`}
                >
                  <option value="sun_direct">Sun Direct (சன் டைரக்ட்)</option>
                  <option value="tata_play">Tata Play (டாடா பிளே)</option>
                  <option value="airtel_dth">Airtel Digital TV (ஏர்டெல்)</option>
                  <option value="dish_tv">Dish TV & D2H (டிஷ் டிவி)</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1.5 ${currentTheme.subText}`}>
                  {t.smartCardNumberLabel}
                </label>
                <input
                  type="text"
                  required
                  value={smartCard}
                  onChange={(e) => setSmartCard(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 10 to 12 digit viewing card number"
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl px-3.5 py-2.5 font-mono font-bold focus:outline-none border transition-colors`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1.5 ${currentTheme.subText}`}>
                  {t.boxNickname}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t.boxNicknamePlaceholder}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl px-3.5 py-2.5 font-medium focus:outline-none border transition-colors`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-md ${currentTheme.ctaButtonClass}`}
                >
                  {t.saveBoxBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
