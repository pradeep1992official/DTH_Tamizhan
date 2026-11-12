import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HeroIllustrativeGraphic } from '../src/components/BrandAssets';
import { RechargeHelp } from '../src/components/RechargeHelp';
import { CatalogColumnHeadings, PlanCard } from '../src/components/BrowsePlans/PlanCard';
import { getOperatorTheme } from '../src/lib/theme';
import { localizeCustomerError } from '../src/lib/customerMessages';
import type { BrowsePlan } from '../src/types';

describe('service design and truthful content', () => {
  it.each(['en', 'ta'] as const)('renders localized catalog headings in %s', currentLang => {
    const html = renderToStaticMarkup(<CatalogColumnHeadings currentLang={currentLang} />);
    for (const label of currentLang === 'en' ? ['Operator', 'Pack', 'Duration', 'Total', 'Action'] : ['ஆபரேட்டர்', 'பேக்', 'காலம்', 'மொத்தம்', 'செயல்']) expect(html).toContain(label);
  });
  it('uses the previous artwork for the selected operator', () => {
    const render = (operator: 'sun_direct' | 'tata_play') => renderToStaticMarkup(<HeroIllustrativeGraphic theme={getOperatorTheme(operator)} />);
    expect(render('sun_direct')).not.toBe(render('tata_play'));
    expect(render('sun_direct')).toContain('sun_direct_hero');
    expect(render('tata_play')).toContain('tata_play_hero');
  });
  it.each(['en', 'ta'] as const)('keeps the ID guide without the front-page support block in %s', currentLang => {
    const html = renderToStaticMarkup(<RechargeHelp currentLang={currentLang} />);
    expect(html).toContain('<summary>');
    expect(html).toContain('<figcaption>');
    expect(html).toContain('[FILL IN]');
    expect(html).not.toContain('business-support');
    expect(html).not.toContain('Registered business name');
    expect(html).not.toMatch(/tel:|mailto:/);
    if (currentLang === 'ta') expect(html).not.toContain('Where is my');
  });
  it('uses brand colour for payment actions for every operator', () => {
    for (const operator of ['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h'] as const) {
      expect(getOperatorTheme(operator).primaryColor).toBe('var(--color-brand)');
    }
  });
  it('shows the monthly equivalent even for a one-month catalog row', () => {
    const plan: BrowsePlan = { id: 'fixture', operator: 'sun_direct', name: 'Fixture', type: 'HD', duration_months: 1, price: 259, monthly_equivalent_rate: 259, channel_counts_unavailable: true, channels: [], genre_tags: [], is_recommended: false };
    const html = renderToStaticMarkup(<PlanCard plan={plan} currentTheme={getOperatorTheme('sun_direct')} currentLang="en" isSelectedForCompare={false} canAddToCompare onToggleCompare={vi.fn()} onSelectPlan={vi.fn()} />);
    expect(html).toContain('Rs. 259.00 / month');
    expect(html).toContain('catalog-duration-cell');
    expect(html).toMatch(/class="compact-plan-actions">[\s\S]*type="checkbox"[\s\S]*type="button"/);
  });
  it.each(['en', 'ta'] as const)('gives connection-specific guidance for network failures in %s', lang => {
    const message = localizeCustomerError('Failed to fetch', lang);
    expect(message).not.toBe('Failed to fetch');
    expect(message).toMatch(lang === 'en' ? /connection/ : /இணைப்பை/);
  });
});
