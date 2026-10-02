import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import { Language, UserProfile, isSuperAdminEmail } from '../types';
import { translations } from '../lib/translations';
import { auth, isFirebaseLive, db, sanitizePayload } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSuccess: (profile: UserProfile) => void;
  currentUser: UserProfile | null;
}

function formatNameFromEmail(email?: string): string {
  if (!email) return 'Subscriber';
  if (isSuperAdminEmail(email)) return 'Professor Pradeep S';
  const prefix = email.split('@')[0];
  const clean = prefix.replace(/[_.]/g, ' ').replace(/[0-9]/g, '').trim();
  if (clean.length > 1) {
    return clean
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSuccess,
  currentUser,
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
      if (isFirebaseLive && auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;

        const userEmail = fbUser.email || currentUser?.email || '';
        const isSuperAdmin = isSuperAdminEmail(userEmail);
        const finalDisplayName = fbUser.displayName || (isSuperAdmin ? 'Professor Pradeep S' : formatNameFromEmail(userEmail));

        const profile: UserProfile = {
          uid: fbUser.uid,
          email: userEmail,
          displayName: finalDisplayName,
          photoURL: fbUser.photoURL || undefined,
          phoneNumber: fbUser.phoneNumber || currentUser?.phoneNumber,
          is_worker: isSuperAdmin,
          is_plan_admin: isSuperAdmin,
          role: isSuperAdmin ? 'admin' : 'customer',
          createdAt: currentUser?.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          authProviders: ['google.com'],
        };

        if (isFirebaseLive && db) {
          try {
            await setDoc(doc(db, 'users', profile.uid), sanitizePayload(profile), { merge: true });
            if (isSuperAdmin) {
              await setDoc(doc(db, 'admins', profile.uid), {
                uid: profile.uid,
                email: userEmail,
                displayName: finalDisplayName,
                role: 'admin',
                status: 'approved',
                approvedBy: userEmail,
                approvedAt: new Date().toISOString(),
                notes: 'Root Administrator',
              }, { merge: true });
            }
          } catch (e) {
            console.warn('Firestore user profile save error:', e);
          }
        }

        setIsLoading(false);
        onSuccess(profile);
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg(currentLang === 'ta' ? 'அங்கீகார சேவை தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.' : 'Authentication is currently not available. Please try again later.');
      }
    } catch (err: any) {
      console.warn('Google Auth popup result:', err);
      setIsLoading(false);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      setErrorMsg(err?.message || (currentLang === 'ta' ? 'உள்நுழைவு நிறைவடையவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Google Sign-In was not completed. Please try again.'));
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="bg-[#0e1935] border border-[#1e3058] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-left"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-white">
                {t.loginTitle}
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                {t.loginSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? (currentLang === 'ta' ? 'சரிபார்க்கப்படுகிறது...' : 'Connecting...') : t.googleOption}</span>
            </button>

            <p className="text-xs text-center text-gray-300">
              {t.linkedNotice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
