import { localizeCustomerError } from '../lib/customerMessages';
import { BUSINESS_DETAILS } from '../lib/trustContent';
import React, { useState } from 'react';
import {
  X,
  Tv,
  CheckCircle2,
  Truck,
  Wrench
} from '../lib/icons';
import { Language } from '../types';
import { translations } from '../lib/translations';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
}

export const NewConnectionModal: React.FC<NewConnectionModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  const [operator, setOperator] = useState('sun_direct');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState('Chennai');
  const [address, setAddress] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/installation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ operator, name: name.trim(), mobile, district, address: address.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.request?.id) {
        throw new Error(result.error || translations[currentLang].uiUnableToSubmitTheInstallationRequest);
      }
      setBookingId(result.request.id);
      setIsBooked(true);
    } catch (error) {
      console.error('[Installation Request] Submission failed:', error);
      setSubmitError(currentLang === 'ta'
        ? 'கோரிக்கையை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
        : error instanceof Error ? error.message : translations[currentLang].uiUnableToSubmitTheRequestPleaseTryAgain);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tnDistricts = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Erode', 'Vellore', 'Thanjavur', 'Dindigul',
    'Kanchipuram', 'Cuddalore', 'Tiruppur', 'Nagercoil / Kanyakumari'
  ];

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-dish-title"
        className="hm-dialog bg-paper-2 border border-rule rounded-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg relative text-left"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between bg-paper-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center border border-rule">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 id="new-dish-title" className="text-base font-bold text-ink leading-tight">
                {t.newDishTitle}
              </h2>
              <p className="text-sm text-muted">
                {t.doorstepInstall}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-xl text-muted hover:text-ink hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!isBooked ? (
            <form onSubmit={handleBooking} className="space-y-4 text-sm">
              {/* Operator Cards */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted block">
                  {t.selectDishOperator}
                </label>
                <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'sun_direct', name: 'Sun Direct', price: BUSINESS_DETAILS.installation, highlight: translations[currentLang].uiQuotationRequired },
                    { id: 'tata_play', name: 'Tata Play', price: BUSINESS_DETAILS.installation, highlight: translations[currentLang].uiQuotationRequired },
                    { id: 'airtel_dth', name: 'Airtel DTH', price: BUSINESS_DETAILS.installation, highlight: translations[currentLang].uiQuotationRequired },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`relative p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                        operator === item.id
                          ? 'bg-accent-soft border-rule text-ink shadow-sm'
                          : 'bg-paper-2 border-rule text-muted hover:border-rule'
                      }`}
                    >
                      <input
                        type="radio"
                        name="installation-operator"
                        value={item.id}
                        checked={operator === item.id}
                        onChange={() => setOperator(item.id)}
                        className="sr-only peer"
                      />
                      <span className="absolute inset-0 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-focus" aria-hidden="true" />
                      <p className="font-bold text-ink text-sm">{item.name}</p>
                      <p className="tabular-nums font-bold text-accent text-sm mt-0.5">{item.price}</p>
                      <p className="text-sm text-muted mt-1">{item.highlight}</p>
                    </label>
                  ))}
                </fieldset>
              </div>

              {/* Inclusions */}
              <div className="dialog-section py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-muted">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-accent" />
                  <span className="text-sm block font-medium">{translations[currentLang].uiEquipment}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-success" />
                  <span className="text-sm block font-medium">{translations[currentLang].uiCabling}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent" />
                  <span className="text-sm block font-medium">{translations[currentLang].uiAvailability}</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newconnectionmodal-field-1" className="text-sm font-medium text-muted block mb-1">
                    {t.fullNameLabel} *
                  </label>
                  <input id="newconnectionmodal-field-1"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={translations[currentLang].uiEnterYourName}
                    className="w-full bg-paper-2 border border-rule rounded-xl px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:border-rule"
                  />
                </div>
                <div>
                  <label htmlFor="newconnectionmodal-field-2" className="text-sm font-medium text-muted block mb-1">
                    {t.contactNumberLabel} *
                  </label>
                  <input id="newconnectionmodal-field-2"
                    type="tel"
                    maxLength={10}
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder={translations[currentLang].uiMobilePlaceholder}
                    className="w-full bg-paper-2 border border-rule rounded-xl px-3 py-2 text-sm text-ink tabular-nums placeholder-muted focus:outline-none focus:border-rule"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newconnectionmodal-field-3" className="text-sm font-medium text-muted block mb-1">
                    {t.districtLabel}
                  </label>
                  <select id="newconnectionmodal-field-3"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-paper-2 border border-rule rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-rule"
                  >
                    {tnDistricts.map((d) => (
                      <option key={d} value={d} className="bg-paper-2">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="newconnectionmodal-field-4" className="text-sm font-medium text-muted block mb-1">
                    {t.installationAddressLabel}
                  </label>
                  <input id="newconnectionmodal-field-4"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={translations[currentLang].uiAddressPlaceholder}
                    className="w-full bg-paper-2 border border-rule rounded-xl px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:border-rule"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim() || mobile.length !== 10 || address.trim().length < 5 || isSubmitting}
                aria-busy={isSubmitting}
                className="dialog-primary w-full py-3.5 px-4 rounded-lg bg-accent hover:bg-accent-soft disabled:opacity-50 text-ink font-bold text-sm transition-colors shadow-sm mt-2"
              >
                {isSubmitting
                  ? (translations[currentLang].uiSubmittingRequest)
                  : (translations[currentLang].uiSubmitInstallationRequest)}
              </button>
              {submitError && <p role="alert" className="text-sm text-error">{localizeCustomerError(submitError, currentLang)}</p>}
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-lg bg-success/10 text-success border border-rule mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {t.bookingSuccess}
                </h3>
                <p className="text-sm tabular-nums text-accent font-bold mt-1">
                  Request ID: {bookingId}
                </p>
                <p className="text-sm text-muted mt-2">
                  {translations[currentLang].uiYourInstallationRequestHasBeenReceivedOurTeamWillContactYouToConfirmTh}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-paper hover:bg-paper text-ink font-bold text-sm transition-colors"
              >
                {t.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
