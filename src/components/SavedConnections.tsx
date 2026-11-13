import { formatMessage } from '../lib/customerMessages';
import { subscriberError, subscriberHelp, subscriberRule, subscriberLabel, subscriberPlaceholder, normalizeSubscriberId } from '../lib/subscriberValidation';
import { getConnectionExpiry } from '../lib/connectionExpiry';
import React, { useRef, useState } from 'react';
import {
  Tv,
  Plus,
  Trash2,
  Zap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  X
} from '../lib/icons';
import { DthConnection, DthOperatorId, Language, UserProfile, resolveDishFamilyOperatorId } from '../types';
import { translations } from '../lib/translations';
import { OperatorTheme, getOperatorTheme } from '../lib/theme';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { OperatorCardLogo } from './BrandAssets';

interface SavedConnectionsProps {
  connections: DthConnection[];
  currentLang: Language;
  user: UserProfile | null;
  onQuickRecharge: (conn: DthConnection) => void;
  onAddConnection: (conn: Omit<DthConnection, 'id' | 'createdAt'> | DthConnection) => void;
  onDeleteConnection: (id: string) => void;
  onOpenAuth: () => void;
  currentTheme: OperatorTheme;
}

export const SavedConnections: React.FC<SavedConnectionsProps> = ({
  connections,
  currentLang,
  user,
  onQuickRecharge,
  onAddConnection,
  onDeleteConnection,
  onOpenAuth,
  currentTheme,
}) => {
  const t = translations[currentLang];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<DthConnection | null>(null);
  const [operator, setOperator] = useState<DthOperatorId>('sun_direct');
  const [smartCard, setSmartCard] = useState('');
  const [idError, setIdError] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [customerName, setCustomerName] = useState('');
  const backdropPointerDown = useRef(false);

  const isLight = currentTheme.isLightMode;

  const { modalRef } = useAccessibleModal({
    isOpen: isAddOpen,
    onClose: () => setIsAddOpen(false),
  });

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const error = subscriberError(operator, smartCard, true, currentLang);
    setIdError(error);
    if (error) { document.getElementById('saved-box-id')?.focus(); return; }

    const opNames: Record<DthOperatorId, string> = {
      sun_direct: 'Sun Direct',
      tata_play: 'Tata Play',
      airtel_dth: 'Airtel Digital TV',
      dish_tv: 'Dish TV',
      d2h: 'D2H',
    };
    const cleanCard = normalizeSubscriberId(smartCard);
    const selectedOperator = operator === 'dish_tv' || operator === 'd2h'
      ? resolveDishFamilyOperatorId(cleanCard)
      : operator;

    onAddConnection({
      ...(editing || {}),
      user_id: user?.uid || 'guest_user',
      operator: selectedOperator,
      operatorName: opNames[selectedOperator] || 'Dish TV',
      smartCardNumber: cleanCard,
      nickname: nickname || t.uiSetTopBox,
      customerName: customerName.trim() || undefined,
    });

    setIsAddOpen(false);
    setSmartCard('');
    setEditing(null);
  };

  return (
    <div className="connections-page space-y-6 text-left">
      {/* Header Bar Themed */}
      <div
        className={`page-heading flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="space-y-1 max-w-xl">
          <h1 className={`text-2xl font-bold flex items-center gap-2.5 ${currentTheme.headingText} ${currentTheme.fontHeadingClass}`}>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-paper border-rule' : 'bg-scrim/30 border-rule-strong'
              }`}
              style={{ borderColor: `color-mix(in oklab, ${currentTheme.primaryColor} 31%, transparent)` }}
            >
              <Tv className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
            </div>
            <span>{t.myConnectionsTitle}</span>
          </h1>
          <p className={`text-xs ${currentTheme.subText}`}>
            {translations[currentLang].uiManageYourSavedSetTopBoxesAndRechargeThemQuickly}
          </p>
        </div>

        <button
          id="add-connection-btn"
          onClick={() => {
            if (!user) {
              onOpenAuth();
            } else {
              setEditing(null);
              setSmartCard('');
              setIdError(null);
              setIsAddOpen(true);
            }
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-colors  active:scale-[0.98] ${currentTheme.ctaButtonClass}`}
        >
          <Plus className="w-4 h-4" />
          <span>{t.addConnection}</span>
        </button>
      </div>

      {/* Cards Grid */}
      {connections.length > 0 ? (
        <div className="connection-list">
          {connections.map((conn) => {
            const normalizedOp = conn.operator === 'd2h' ? 'dish_tv' : conn.operator;
            const expiry = getConnectionExpiry(conn);
            const expiryDate = expiry ? new Date(`${expiry.slice(0, 10)}T00:00:00+05:30`) : null;
            const validExpiry = expiryDate && Number.isFinite(expiryDate.getTime());
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
            const expired = validExpiry && expiry!.slice(0, 10) < today;
            const operatorNames: Record<string, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel Digital TV', dish_tv: 'Dish TV & D2H' };
            const connectionError = subscriberError(conn.operator, conn.smartCardNumber, false, currentLang);
            const editConnection = () => {
              setEditing(conn); setOperator(normalizedOp); setSmartCard(conn.smartCardNumber);
              setNickname(conn.nickname); setCustomerName(conn.customerName || '');
              setIdError(connectionError); setIsAddOpen(true);
            };

            return (
              <div
                key={conn.id}
                className={`connection-card ${currentTheme.cardInactiveBg} ${currentTheme.cardInactiveBorder} border rounded-2xl relative group transition-colors flex flex-col`}
              >
                <div>
                  {/* Card Header with Specific Operator Badge */}
                  <div className="connection-card-header">
                      <div className="connection-operator-logo" role="img" aria-label={operatorNames[normalizedOp] || conn.operatorName}>
                        <OperatorCardLogo operatorId={normalizedOp} className="connection-operator-logo-image" />
                      </div>
                    <div className="connection-card-identity">
                      <h3 className={`font-bold text-base ${currentTheme.headingText}`}>
                        {conn.nickname}
                      </h3>
                      <p className={`text-xs font-mono mt-0.5 ${currentTheme.mutedText}`}>
                        <strong className={currentTheme.headingText}>{conn.smartCardNumber}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(formatMessage(t.uiConfirmRemoveBox, { name: conn.nickname }))) onDeleteConnection(conn.id);
                      }}
                      aria-label={formatMessage(t.uiRemoveNamedBox, { name: conn.nickname })}
                      className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-xl transition-colors text-error hover:bg-error-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-error   "
                      title={translations[currentLang].uiRemoveConnection}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Saved expiry details */}
                  <div className="connection-meta text-sm">
                    {validExpiry && (
                      <div className="connection-detail-row">
                        <span className={`text-xs font-medium block ${currentTheme.mutedText}`}>{translations[currentLang].uiExpiry}</span>
                        <div className="connection-expiry-row"><span className="font-medium text-sm">
                          {expiryDate!.toLocaleDateString(translations[currentLang].uiEnIN, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </span>
                        <span className={`connection-status ${expired ? 'is-expired' : 'is-active'}`}>{expired ? translations[currentLang].uiExpired : translations[currentLang].uiActive}</span></div>
                      </div>
                    )}
                  </div>

                  {connectionError && <p role="alert" className="connection-validation text-error">{connectionError}</p>}
                  {conn.packName && (
                    <div className="connection-pack connection-detail-row text-sm">
                      <span className={currentTheme.mutedText}>{translations[currentLang].uiCurrentPack}</span>
                      <span className="font-medium block break-words">
                        {conn.packName}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`connection-actions flex items-center pt-3 border-t ${currentTheme.surfaceBorder}`}>
                  <button type="button" className="connection-edit" onClick={editConnection}>{translations[currentLang].uiEdit}</button>
                  <button
                    type="button"
                    onClick={connectionError ? editConnection : () => onQuickRecharge(conn)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${currentTheme.cardButtonActive}`}
                  >
                    {!connectionError && <Zap className="w-3.5 h-3.5" />}
                    <span>{connectionError ? (currentLang === 'ta' ? 'ஐடியைத் திருத்தவும்' : 'Update ID') : t.rechargeAgain}</span>
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
              backgroundColor: `color-mix(in oklab, ${currentTheme.primaryColor} 8%, transparent)`,
              borderColor: `color-mix(in oklab, ${currentTheme.primaryColor} 19%, transparent)`
            }}
          >
            <Tv className="w-8 h-8" style={{ color: currentTheme.primaryColor }} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className={`font-bold text-base ${currentTheme.headingText}`}>
              {translations[currentLang].uiNoSavedSetTopBoxes}
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
                setEditing(null);
              setSmartCard('');
              setIdError(null);
              setIsAddOpen(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-colors shadow-md ${currentTheme.ctaButtonClass}`}
          >
            <Plus className="w-4 h-4" />
            <span>{t.addFirstBox}</span>
          </button>
        </div>
      )}

      {/* Add Connection Modal Themed */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/70 backdrop-blur-sm   duration-200"
          onPointerDown={(e) => { backdropPointerDown.current = e.target === e.currentTarget; }}
          onPointerCancel={() => { backdropPointerDown.current = false; }}
          onClick={(e) => {
            if (backdropPointerDown.current && e.target === e.currentTarget) setIsAddOpen(false);
            backdropPointerDown.current = false;
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
                <span>{editing ? "Edit Box" : t.addSetTopBox}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label={t.close}
                className={`p-1.5 rounded-lg hover:bg-ink ${currentTheme.subText}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleSubmitNew} className="space-y-4 text-xs">
              <div>
                <label className={`block font-medium mb-1.5 ${currentTheme.subText}`}>
                  {t.dthOperatorLabel}
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as DthOperatorId)}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} rounded-xl px-3.5 py-2.5 font-medium focus:outline-none border transition-colors`}
                >
                  <option value="sun_direct">{t.uiSunDirect}</option>
                  <option value="tata_play">{t.uiTataPlay}</option>
                  <option value="airtel_dth">{t.uiAirtel}</option>
                  <option value="dish_tv">{t.uiDishD2h}</option>
                </select>
              </div>

              <div>
                <label className={`block font-medium mb-1.5 ${currentTheme.subText}`}>
                  {subscriberLabel(operator, true, currentLang)}
                </label>
                <input
                  type="text"
                  id="saved-box-id"
                  aria-invalid={!!idError}
                  aria-describedby="saved-box-help"
                  value={smartCard}
                  onChange={(e) => setSmartCard(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={subscriberPlaceholder(operator, true, currentLang)}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl px-3.5 py-2.5 font-mono font-bold focus:outline-none border transition-colors`}
                />
              </div>

              <p id="saved-box-help" role={idError ? "alert" : undefined} className={idError ? "text-error" : ""}>{(idError && subscriberError(operator, smartCard, true, currentLang)) || subscriberHelp(operator, true, currentLang)}</p>
              <div>
                <label className={`block font-medium mb-1.5 ${currentTheme.subText}`}>
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
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-colors shadow-md ${currentTheme.ctaButtonClass}`}
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
