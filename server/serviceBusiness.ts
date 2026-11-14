import { BUSINESS_DETAILS } from '../src/lib/trustContent';
// Shared existing business details plus the deployment's public website URL.
export function serviceBusinessDetails() { return { ...BUSINESS_DETAILS, website: process.env.APP_URL || 'DTH Tamizhan' }; }
