import React from 'react';
import type { Language } from '../../types';
import type { NewConnectionOrder } from '../../lib/newConnectionOrders';

export function ProviderBookingDetails({ order, lang }: { order: NewConnectionOrder; lang: Language }) {
  if (!order.providerCustomerId && !order.providerBookingId) return null;
  const ta = lang === 'ta';
  return <section className="connection-provider-booking">
    <h3>{ta ? 'DTH நிறுவனப் பதிவு விவரங்கள்' : 'DTH provider booking details'}</h3>
    <dl>
      {order.providerCustomerId && <div><dt>{ta ? 'வாடிக்கையாளர் எண்' : 'Provider customer ID'}</dt><dd>{order.providerCustomerId}</dd></div>}
      {order.providerBookingId && <div><dt>{ta ? 'நிறுவனப் பதிவு எண்' : 'Provider booking ID'}</dt><dd>{order.providerBookingId}</dd></div>}
    </dl>
  </section>;
}
