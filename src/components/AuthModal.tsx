import { localizeCustomerError } from '../lib/customerMessages';
import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle
} from '../lib/icons';
import { Language } from '../types';
import { translations } from '../lib/translations';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSuccess,
}) => {
  const t = translations[currentLang];
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);

        setIsLoading(false);
        onSuccess();
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg(translations[currentLang].uiAuthenticationIsCurrentlyNotAvailablePleaseTryAgainLater);
      }
    } catch (err: any) {
      console.warn('Google Auth popup result:', err);
      setIsLoading(false);
      if (err?.code === 'auth/cancelled-popup-request') {
        return;
      }

      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg(translations[currentLang].uiTheSignInWindowClosedBeforeAuthenticationCompletedTryAgainIfItKeepsHap);
        return;
      }

      setErrorMsg(err?.message || (translations[currentLang].uiGoogleSignInWasNotCompletedPleaseTryAgain));
    }
  };

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="hm-dialog bg-paper-2 border border-rule rounded-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg relative text-left"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-rule flex items-center justify-between bg-paper-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-soft border border-rule text-accent flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-ink">
                {t.loginTitle}
              </h2>
              <p className="text-sm text-muted mt-0.5">
                {t.loginSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-muted hover:text-ink hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-xl bg-error/10 border border-rule text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-error" />
              <span>{localizeCustomerError(errorMsg, currentLang)}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full py-3.5 px-4 rounded-lg bg-paper hover:bg-paper-2 text-ink font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus"
            >
              <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="var(--google-blue)"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="var(--google-green)"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="var(--google-yellow)"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="var(--google-red)"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? (translations[currentLang].uiConnecting) : t.googleOption}</span>
            </button>

            <p className="text-sm text-center text-muted">
              {t.linkedNotice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

