import React, { useId, useState } from 'react';
import { fullAddressSchema, pinCodeSchema } from '../lib/tickets';
import type { Language } from '../types';
export function HelpAddressFields({ address, pinCode, onAddressChange, onPinChange, language, showErrors = false }: {
  address: string; pinCode: string; onAddressChange: (value: string) => void; onPinChange: (value: string) => void; language: Language; showErrors?: boolean;
}) {
  const id = useId(); const [addressTouched, setAddressTouched] = useState(false); const [pinTouched, setPinTouched] = useState(false);
  const say = (en: string, ta: string) => language === 'ta' ? ta : en;
  const addressError = (showErrors || addressTouched) && !fullAddressSchema.safeParse(address).success;
  const pinError = (showErrors || pinTouched) && !pinCodeSchema.safeParse(pinCode).success;
  return <div className="space-y-4">
    <div><label htmlFor={`${id}-address`} className="block">{say('Full address', 'முழு முகவரி')}</label>
      <textarea id={`${id}-address`} name="fullAddress" autoComplete="street-address" required minLength={15} maxLength={500} rows={3} value={address}
        onChange={event => onAddressChange(event.target.value)} onBlur={() => setAddressTouched(true)} onInvalid={event => { event.preventDefault(); setAddressTouched(true); }}
        aria-invalid={addressError || undefined} aria-describedby={addressError ? `${id}-address-error` : undefined}
        placeholder={say('Door / street, locality, city and state', 'கதவு / தெரு, பகுதி, நகரம் மற்றும் மாநிலம்')} className="mt-1 block w-full border border-rule rounded-xl p-3" />
      {addressError && <p id={`${id}-address-error`} role="alert" className="mt-1 text-sm text-error">{say('Enter your full address, including locality and city (at least 15 characters).', 'பகுதி மற்றும் நகரத்துடன் முழு முகவரியை உள்ளிடவும் (குறைந்தது 15 எழுத்துகள்).')}</p>}
    </div>
    <div><label htmlFor={`${id}-pin`} className="block">{say('PIN code', 'அஞ்சல் குறியீடு')}</label>
      <input id={`${id}-pin`} name="pinCode" inputMode="numeric" autoComplete="postal-code" required pattern="[1-9][0-9]{5}" maxLength={6} value={pinCode}
        onChange={event => onPinChange(event.target.value)} onBlur={() => setPinTouched(true)} onInvalid={event => { event.preventDefault(); setPinTouched(true); }}
        aria-invalid={pinError || undefined} aria-describedby={pinError ? `${id}-pin-error` : undefined} placeholder="605757" className="mt-1 block w-full border border-rule rounded-xl p-3" />
      {pinError && <p id={`${id}-pin-error`} role="alert" className="mt-1 text-sm text-error">{say('Enter a valid six-digit PIN code.', 'சரியான ஆறு இலக்க அஞ்சல் குறியீட்டை உள்ளிடவும்.')}</p>}
    </div>
  </div>;
}
