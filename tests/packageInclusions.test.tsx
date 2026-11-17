import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PackageInclusions } from '../src/components/NewConnection/PackageInclusions';

it('states all full-set inclusions without requiring an existing dish', () => {
  const html = renderToStaticMarkup(<PackageInclusions packageType="full_set" boxType="HD" lang="en" />);
  expect(html.replace(/<[^>]*>/g, '')).toContain('HD set-top box');
  expect(html).toContain('Remote control');
  expect(html).toContain('Free installation');
  expect(html.replace(/<[^>]*>/g, '')).toContain('New dish');
  expect((html.match(/<svg/g) ?? []).length).toBe(4);
  expect(html).toContain('No existing dish required.');
});

it('makes the box-only exclusion explicit for Android and HD packages', () => {
  const html = renderToStaticMarkup(<PackageInclusions packageType="only_box" boxType="Android" lang="en" />);
  expect(html.replace(/<[^>]*>/g, '')).toContain('Android set-top box');
  expect(html).toContain('Remote control');
  expect(html).toContain('Free installation');
  expect(html).toContain('Not included');
  expect(html).toContain('New dish. An existing dish is required.');
  expect(html).toContain('connection-excluded');
  expect((html.match(/<svg/g) ?? []).length).toBe(4);
});
