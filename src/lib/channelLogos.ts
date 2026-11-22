import logos from './channelLogos.json';

const localLogos: Readonly<Record<string, { path: string }>> = logos;

export function channelLogoUrl(name: string, remoteUrl = '') {
  return localLogos[name]?.path ?? remoteUrl;
}
