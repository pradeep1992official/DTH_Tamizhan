import React, { useEffect, useRef } from 'react';
import { packageTypeLabel } from '../../lib/newConnectionCatalog';
import { PackageInclusions } from './PackageInclusions';

type Props = React.ComponentProps<typeof PackageInclusions>;

export function PackageTooltip({ summaryOnly = false, ...props }: Props & { summaryOnly?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const closeOutside = (event: Event) => {
      if (details.open && !details.contains(event.target as Node)) details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return <details ref={ref} className="connection-package-info" onToggle={event => {
    if (!event.currentTarget.open) return;
    for (const other of document.querySelectorAll<HTMLDetailsElement>('details.connection-package-info[open]')) {
      if (other !== event.currentTarget) other.open = false;
    }
  }}>
    <summary aria-label={`About ${packageTypeLabel(props.packageType, props.lang)}`}><span aria-hidden="true">i</span></summary>
    {summaryOnly ? <p className="connection-package-tooltip-summary">{props.lang === 'en' ? `${props.boxType} box, remote and installation included${props.packageType === 'full_set' ? ', with a new dish.' : '; your existing dish is required.'}` : `${props.boxType} ${props.packageType === 'full_set' ? '\u0b9f\u0bbf\u0bb7\u0bcd' : '\u0baa\u0bc6\u0b9f\u0bcd\u0b9f\u0bbf'}`}</p> : <PackageInclusions {...props} />}
  </details>;
}
