import React from 'react';
import { packPackageType, type Pack } from '../../lib/newConnectionCatalog';

interface Props {
  brand: string;
  pack: string;
  packageType?: Pack['packageType'];
  offer?: string;
  boxType?: Pack['boxType'];
}

export function packageImage({ brand, pack, packageType, boxType, offer = '' }: Props) {
  if (boxType === 'Android') return null;
  const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const airtel = normalizedBrand.includes('airtel');
  const tataPlay = normalizedBrand.includes('tataplay');
  if (!airtel && !tataPlay) return null;
  const type = packPackageType({ name: pack, packageType })
    ?? (/set-top box only|only[\s_-]*box/i.test(offer) ? 'only_box' : /full[\s_-]*set/i.test(offer) ? 'full_set' : undefined);
  if (!type) return null;
  if (tataPlay) return type === 'full_set'
    ? { src: '/package-images/tata-play-full-set.png', alt: 'Tata Play dish, set-top box and remote', width: 500, height: 500 }
    : { src: '/package-images/tata-play-set-top-box.png', alt: 'Tata Play set-top box and remote', width: 1536, height: 1024 };
  return type === 'full_set'
    ? { src: '/package-images/airtel-full-set.png', alt: 'Airtel dish and set-top box', width: 504, height: 495 }
    : { src: '/package-images/airtel-set-top-box.png', alt: 'Airtel set-top box', width: 2172, height: 724 };
}

export function PackageImage(props: Props) {
  const image = packageImage(props);
  if (!image) return null;
  const normalizedBrand = props.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const brand = normalizedBrand.includes('airtel') ? 'airtel' : normalizedBrand.includes('tataplay') ? 'tata-play' : '';
  const packageType = packPackageType({ name: props.pack, packageType: props.packageType });
  return <div className="connection-package-image" data-brand={brand} data-package-type={packageType || ''}><img {...image} loading="lazy" decoding="async" /></div>;
}
