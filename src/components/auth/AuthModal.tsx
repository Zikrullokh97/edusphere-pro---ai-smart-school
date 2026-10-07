import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UserRole, AppLanguage, UserProfile } from '../../types';
import { useI18n } from '../../lib/i18n';
import { signInWithEmail, registerWithEmail, signInWithGoogle, resetPassword, getUserProfileFromFirestore, saveUserProfileToFirestore } from '../../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  currentRole: UserRole;
  onAuthSuccess: (role: UserRole, userDisplayName?: string, profile?: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  currentRole,
  onAuthSuccess,
}) => {
  const t = useI18n(language);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form fields
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || 'admin');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = emailOrUsername.trim().toLowerCase();
    // Do not trim passwords: spaces may be part of a valid password.
    const cleanPass = password;

    if (!cleanUser || !cleanPass) {
      setErrorMessage(t('authEnterCredentials'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Authenticate against backend Auth API (/api/auth/login)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanUser, password: cleanPass }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.user) {
          try {
            localStorage.setItem('edusphere_auth_token', data.token);
            localStorage.setItem('edusphere_saved_role', data.user.role);
          } catch {}

          setSuccessMessage(language === 'uz' ? 'Muvaffaqiyatli kirdingiz!' : 'Login successful!');
          setTimeout(() => {
            onAuthSuccess(data.user.role, data.user.name, data.user);
            onClose();
          }, 500);
          setIsLoading(false);
          return;
        }
      } else if (response.status === 401 || response.status === 403) {
        // The legacy development login may not know Firebase-managed accounts.
        // Continue to Firebase Auth instead of blocking valid Firebase credentials.
        await response.json().catch(() => ({}));
      }
    } catch {
      // Backend request unreachable or offline fallback
    }

    // Production: authenticate only through Firebase Auth.
    /*
    if (cleanPass === '123456') {
      const isTeacher = cleanUser.includes('teacher') || cleanUser.startsWith('tch-');
      const isParent = cleanUser.includes('parent') || cleanUser.includes('student') || cleanUser.startsWith('par-');
      const inferredRole: UserRole = isTeacher ? 'teacher' : isParent ? 'parent_student' : 'admin';
      const displayName = cleanUser === 'admin' ? 'Admin' : isTeacher ? 'O‘qituvchi' : 'Alisher Nurdinov';

      setSuccessMessage(language === 'uz' ? 'Muvaffaqiyatli kirdingiz!' : 'Login successful!');
      try {
        localStorage.setItem('edusphere_saved_role', inferredRole);
      } catch {}
      setTimeout(() => {
        onAuthSuccess(inferredRole, displayName);
        onClose();
      }, 500);
      setIsLoading(false);
      return;
    }

    // 3. Real Firebase Auth fallback
    */
    try {
      const user = await signInWithEmail(cleanUser, cleanPass);
      let profile = await getUserProfileFromFirestore(user.uid);

      // Recover accounts whose Firebase Auth user was created but whose profile
      // write failed during an earlier registration attempt. New users stay unprivileged.
      if (!profile) {
        await saveUserProfileToFirestore({
          userId: user.uid,
          email: user.email || cleanUser,
          displayName: user.displayName || user.email?.split('@')[0] || 'EduSphere User',
          role: 'parent_student',
        });
        profile = await getUserProfileFromFirestore(user.uid);
      }

      if (!profile) {
        throw new Error('PROFILE_UNAVAILABLE');
      }

      setSuccessMessage(t('authSuccess'));
      setTimeout(() => {
        onAuthSuccess(profile!.role, profile!.name || user.displayName || user.email || undefined, profile!);
        onClose();
      }, 500);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/network-request-failed') {
        setErrorMessage(language === 'uz' ? 'Internet yoki Firebase ulanishini tekshiring.' : 'Check your internet connection and Firebase configuration.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage(language === 'uz' ? 'Urinishlar juda ko‘p. Birozdan keyin qayta urinib ko‘ring.' : 'Too many attempts. Please try again later.');
      } else if (err?.message === 'PROFILE_UNAVAILABLE') {
        setErrorMessage(language === 'uz' ? 'Profilni yuklab bo‘lmadi. Firebase Firestore ruxsatlarini tekshiring.' : 'Could not load the user profile. Check Firestore permissions.');
      } else {
        setErrorMessage(t('authInvalidCredentials'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password.trim() || !fullName.trim()) {
      setErrorMessage(t('authFillAll'));
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t('authPasswordMin'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await registerWithEmail(
        emailOrUsername.trim(),
        password,
        fullName.trim(),
        selectedRole
      );
      setSuccessMessage(t('authRegisterSuccess'));
      const profile = await getUserProfileFromFirestore(user.uid);
      if (!profile) {
        throw new Error('PROFILE_UNAVAILABLE');
      }
      setTimeout(() => {
        // Public self-registration must never grant admin/teacher privileges.
        onAuthSuccess(profile.role, profile.name || user.displayName || fullName, profile);
        onClose();
      }, 700);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/email-already-in-use') {
        setErrorMessage(language === 'uz' ? 'Bu email allaqachon ro‘yxatdan o‘tgan. Kirish bo‘limidan foydalaning.' : 'This email is already registered. Please sign in.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage(language === 'uz' ? 'Email manzili noto‘g‘ri.' : 'The email address is invalid.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage(language === 'uz' ? 'Parol juda sodda. Kamida 6 ta belgidan foydalaning.' : 'Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage(language === 'uz' ? 'Internet yoki Firebase ulanishini tekshiring.' : 'Check your internet connection and Firebase configuration.');
      } else if (err?.message === 'PROFILE_UNAVAILABLE' || code === 'permission-denied') {
        setErrorMessage(language === 'uz' ? 'Hisob yaratildi, ammo profil saqlanmadi. Firebase Firestore qoidalarini tekshirish kerak.' : 'The account was created, but its profile could not be saved. Check Firestore rules.');
      } else {
        setErrorMessage(t('authRegisterFailed'));
      }
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      setErrorMessage(t('authEmailRequired'));
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await resetPassword(emailOrUsername.trim());
      setSuccessMessage(t('authResetSent'));
    } catch {
      setSuccessMessage(t('authResetSent'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithGoogle();
      onAuthSuccess('admin', result.user.displayName || 'Google User');
      onClose();
    } catch {
      setErrorMessage(t('authGoogleFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = () => {
    setErrorMessage(t('authFacebookUnavailable'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Vibrant Gradient Backdrop (Blue to Purple/Magenta) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-pink-500 opacity-95 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modern Neomorphic / Glass Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-white/50"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label={t('authClose')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Centered Circular User Avatar with Pink-to-Purple Gradient Fill */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-600 p-1 shadow-lg shadow-purple-500/30">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 backdrop-blur-xs text-white">
            <User className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            {isForgotPassword
              ? t('tabForgot')
              : isSignUp
              ? t('tabSignUp')
              : t('tabSignIn')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isForgotPassword
              ? t('authForgotSubtitle')
              : isSignUp
              ? t('authSignUpSubtitle')
              : t('authSignInSubtitle')}
          </p>
        </div>

        {/* Alerts / Error Feedback */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Forms */}
        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('authEmailOnlyLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? t('authSending') : t('authResetButton')}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                ← {t('authForgotBack')}
              </button>
            </div>
          </form>
        ) : isSignUp ? (
          <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('authFullNameLabel')}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('authNamePlaceholder')}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('authEmailOnlyLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('authPasswordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? t('authLoading') : t('signUpButton')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('authEmailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder={t('authLoginPlaceholder')}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {t('authPasswordLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                >
                  {t('authForgotLabel')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-10 py-3 text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Main CTA Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isLoading ? t('authLoading') : t('signInButton')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Divider & Social Logins */}
        {!isForgotPassword && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200"></div>
              <span className="bg-white px-3 text-xs text-slate-400 font-medium whitespace-nowrap">
                {t('orContinueWith')}
              </span>
              <div className="w-full border-t border-slate-200"></div>
            </div>

            {/* Circular Social Login Buttons */}
            <div className="mt-4 flex items-center justify-center gap-4">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
                title={t('authGoogleTitle')}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-1.9.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
                title={t('authFacebookTitle')}
              >
                <svg className="h-5 w-5 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Switcher */}
        <div className="mt-6 text-center pt-2">
          {isSignUp ? (
            <p className="text-xs text-slate-500">
              {t('authAlreadyAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setIsForgotPassword(false);
                  setErrorMessage(null);
                }}
                className="font-bold text-purple-600 hover:text-purple-700"
              >
                {t('tabSignIn')} &gt;
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              {t('authNotRegistered')}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setIsForgotPassword(false);
                  setErrorMessage(null);
                }}
                className="font-bold text-purple-600 hover:text-purple-700"
              >
                {t('tabSignUp')} &gt;
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
