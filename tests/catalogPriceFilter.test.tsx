import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PlanFilterSidebar } from '../src/components/BrowsePlans/PlanFilterSidebar';
import type { PlanFilters } from '../src/types';
const filters: PlanFilters = { operators: [], type: 'all', durations: [], priceRange: [100, Infinity], channelRange: [0, 500], genreTags: [], sortBy: 'recommended', searchQuery: '' };
describe('catalog price range', () => {
  it('renders the actual catalog ceiling without displaying Infinity', () => {
    const html = renderToStaticMarkup(<PlanFilterSidebar filters={filters} onChange={vi.fn()} onReset={vi.fn()} currentLang="en" currentTheme={{ isLightMode: true } as any} totalResults={15} priceMaximum={8200} />);
    expect(html).toContain('max="8200"'); expect(html).toContain('value="8200"');
    expect(html).not.toContain('Infinity');
  });
  it('keeps a deliberately narrower price selection', () => {
    const html = renderToStaticMarkup(<PlanFilterSidebar filters={{ ...filters, priceRange: [100, 5000] }} onChange={vi.fn()} onReset={vi.fn()} currentLang="en" currentTheme={{ isLightMode: true } as any} totalResults={13} priceMaximum={8200} />);
    expect(html).toContain('max="8200"'); expect(html).toContain('value="5000"');
  });
});
