import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PackageImage, packageImage } from '../src/components/NewConnection/PackageImage';

it('uses the dish image for full sets and the isolated box for box-only packages', () => {
  expect(packageImage({ brand: 'Airtel', pack: 'Tamil Super Star HD', packageType: 'full_set' })?.src).toBe('/package-images/airtel-full-set.png');
  const html = renderToStaticMarkup(<PackageImage brand="Airtel" pack="Tamil Super Star HD" packageType="only_box" />);
  expect(html).toContain('/package-images/airtel-set-top-box.png');
  expect(html).toContain('alt="Airtel set-top box"');
  expect(html).toContain('loading="lazy"');
  expect(html).not.toContain('airtel-full-set.png');
});

it('uses historical order snapshots without adding images to other brands or unknown packages', () => {
  expect(packageImage({ brand: 'Airtel Digital TV', pack: 'Tamil Super Star HD - FULL SET' })?.alt).toBe('Airtel dish and set-top box');
  expect(packageImage({ brand: 'Airtel', pack: 'Renamed pack', offer: 'Set-top box only' })?.alt).toBe('Airtel set-top box');
  expect(packageImage({ brand: 'Sun Direct', pack: 'Full set', packageType: 'full_set' })).toBeNull();
  expect(packageImage({ brand: 'Airtel', pack: 'Full set', packageType: 'full_set', boxType: 'Android' })).toBeNull();
  expect(packageImage({ brand: 'Airtel', pack: 'Unknown package' })).toBeNull();
});

it('uses the matching Tata Play image for each package without showing HD hardware for Android', () => {
  expect(packageImage({ brand: 'Tata Play', pack: 'Tamil Thalaiva HDs - FULL SET' })?.src).toBe('/package-images/tata-play-full-set.png');
  const html = renderToStaticMarkup(<PackageImage brand="Tata Play" pack="Tamil Thalaiva HDs" packageType="only_box" boxType="HD" />);
  expect(html).toContain('/package-images/tata-play-set-top-box.png');
  expect(html).toContain('alt="Tata Play set-top box and remote"');
  expect(html).not.toContain('tata-play-full-set.png');
  expect(packageImage({ brand: 'Tata Play', pack: 'Tamil Thalaiva HDs', packageType: 'only_box', boxType: 'Android' })).toBeNull();
});
