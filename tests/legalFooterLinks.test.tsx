import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LegalFooterLinks } from '../src/components/LegalFooterLinks';
import { SignalLostPage } from '../src/components/SignalLostPage';
import { ServerSignalPage } from '../src/components/ServerSignalPage';
import { POLICY_ROUTES } from '../src/lib/trustContent';

it.each(['en', 'ta'] as const)('keeps all legal destinations available without JavaScript or a router in %s', currentLang => {
  const links = renderToStaticMarkup(<LegalFooterLinks currentLang={currentLang} />);
  for (const route of POLICY_ROUTES) {
    expect(links).toContain(`href="${route.path}"`);
    expect(links).toContain(route[currentLang].replace(/&/g, '&amp;'));
  }
  for (const page of [<SignalLostPage currentLang={currentLang} />, <ServerSignalPage currentLang={currentLang} />]) {
    const footer = renderToStaticMarkup(page).match(/<footer[\s\S]*?<\/footer>/)?.[0];
    expect(footer).toBeTruthy();
    for (const route of POLICY_ROUTES) expect(footer).toContain(`href="${route.path}"`);
  }
});
