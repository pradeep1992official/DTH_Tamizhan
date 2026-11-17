import React from 'react';
import { Check, X } from '../../lib/icons';
import type { Pack } from '../../lib/newConnectionCatalog';
import type { Language } from '../../types';

export function PackageInclusions({ packageType, boxType, lang }: {
  packageType: NonNullable<Pack['packageType']>;
  boxType: 'HD' | 'Android';
  lang: Language;
}) {
  const ta = lang === 'ta';
  return <div className="connection-package-inclusions" data-package-type={packageType}>
    <section className="connection-included"><strong>{ta ? 'சேர்ந்துள்ளவை' : 'Included'}</strong>
    <ul>
      <li><Check size={16} aria-hidden="true" />{boxType} {ta ? 'செட்-டாப் பெட்டி' : 'set-top box'}</li>
      <li><Check size={16} aria-hidden="true" />{ta ? 'ரிமோட்' : 'Remote control'}</li>
      <li><Check size={16} aria-hidden="true" />{ta ? 'இலவச நிறுவல்' : 'Free installation'}</li>
      {packageType === 'full_set' && <li><Check size={16} aria-hidden="true" />{ta ? 'புதிய டிஷ்' : 'New dish'}</li>}
    </ul></section>
    {packageType === 'only_box' ? <section className="connection-excluded">
      <strong>{ta ? 'சேர்க்கப்படாதது' : 'Not included'}</strong>
      <p><X size={16} aria-hidden="true" />{ta ? 'புதிய டிஷ் சேர்க்கப்படாது. ஏற்கனவே உள்ள டிஷ் தேவை.' : 'New dish. An existing dish is required.'}</p>
    </section> : <p className="connection-inclusion-note">{ta ? 'ஏற்கனவே டிஷ் வைத்திருக்க வேண்டியதில்லை.' : 'No existing dish required.'}</p>}
  </div>;
}
