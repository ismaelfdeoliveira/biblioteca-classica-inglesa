import { useState, useCallback, useEffect } from 'react';
import RegisterForm from '@/components/RegisterForm';
import FaceCapture from '@/components/FaceCapture';
import SuccessScreen from '@/components/SuccessScreen';
import LoginForm from '@/components/LoginForm';
import CodeConfirm from '@/components/CodeConfirm';
import SessionWarningModal from '@/components/SessionWarningModal';
import FaceLogin from '@/components/FaceLogin';
import ForgotPassword from '@/components/ForgotPassword';
import NewPasswordScreen from '@/components/NewPasswordScreen';
import Dashboard from '@/components/Dashboard';
import { supabase } from '@/lib/supabase';
import { useSessionTimeout } from '@/lib/useSessionTimeout';
import { BookOpen, Library } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';

type Mode = 'register' | 'login';
type RegisterStep = 'form' | 'face' | 'success';
type LoginStep = 'form' | 'face' | 'code' | 'welcome' | 'forgot' | 'newpassword';

interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  face_token: string;
}

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {labels.map((label, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-serif-display text-sm transition-all duration-500 ${
                  done
                    ? 'border-gold bg-gold text-bordo-deep'
                    : active
                    ? 'border-gold bg-bordo text-parchment scale-110 shadow-lg'
                    : 'border-ink/20 bg-white/40 text-ink/40'
                }`}
              >
                {done ? '✓' : num}
              </div>
              <span
                className={`font-body text-xs tracking-wide uppercase transition-colors duration-300 ${
                  active || done ? 'text-bordo' : 'text-ink/40'
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={`h-px w-8 sm:w-16 transition-colors duration-500 ${
                  done ? 'bg-gold' : 'bg-ink/15'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('register');
  const [regStep, setRegStep] = useState<RegisterStep>('form');
  const [loginStep, setLoginStep] = useState<LoginStep>('form');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false);

  // Detect if the user arrived from a password recovery email link.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setMode('login');
      setLoginStep('newpassword');
    }
  }, []);

  const isLoggedIn = mode === 'login' && loginStep === 'welcome' && !!userProfile;

  const handleSessionExpire = useCallback(() => {
    setLoginStep('form');
    setMode('login');
    setUserProfile(null);
    setConfirmationResult(null);
    setSessionExpiredMsg(true);
  }, []);

  const { showWarning, secondsRemaining, stayConnected } = useSessionTimeout(
    isLoggedIn,
    handleSessionExpire
  );

  // --- Registration flow ---
  function handleRegistered() {
    setRegStep('face');
  }
  function handleFaceComplete() {
    setRegStep('success');
  }
  function handleRegDone() {
    setRegStep('form');
    setMode('login');
    setLoginStep('form');
  }

  // --- Login flow ---
  function handleCodeSent(result: ConfirmationResult, masked: string, fullPhone: string) {
    setConfirmationResult(result);
    setMaskedPhone(masked);
    setPhone(fullPhone);
    setLoginStep('code');
  }
  function handleResend(newResult: ConfirmationResult) {
    setConfirmationResult(newResult);
  }
  function handleCodeVerified(profile: UserProfile) {
    setUserProfile(profile);
    setLoginStep('welcome');
  }
  function handleFaceLoginVerified(profile: UserProfile) {
    setUserProfile(profile);
    setLoginStep('welcome');
  }
  function handleSwitchToFaceLogin() {
    setLoginStep('face');
  }
  function handleFaceLoginBack() {
    setLoginStep('form');
  }
  function handleSwitchToForgotPassword() {
    setLoginStep('forgot');
  }
  function handleForgotPasswordBack() {
    setLoginStep('form');
  }
  function handleNewPasswordBack() {
    // Clear the recovery hash from the URL
    if (window.location.hash.includes('type=recovery')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    supabase.auth.signOut();
    setLoginStep('form');
    setMode('register');
    setRegStep('form');
    setUserProfile(null);
    setConfirmationResult(null);
    setSessionExpiredMsg(false);
  }
  async function handleSignOut() {
    await supabase.auth.signOut();
    setLoginStep('form');
    setMode('register');
    setRegStep('form');
    setUserProfile(null);
    setConfirmationResult(null);
    setSessionExpiredMsg(false);
  }

  function switchToLogin() {
    setMode('login');
    setLoginStep('form');
    setSessionExpiredMsg(false);
  }
  function switchToRegister() {
    setMode('register');
    setRegStep('form');
  }

  const regLabels = ['Account', 'Face', 'Complete'];
  const isFacePath = loginStep === 'face' || (loginStep === 'welcome' && userProfile && false);
  const loginLabels = isFacePath ? ['Login', 'Face', 'Welcome'] : ['Login', 'Verify', 'Welcome'];
  const regStepNum = regStep === 'form' ? 1 : regStep === 'face' ? 2 : 3;
  const loginStepNum =
    loginStep === 'form' ? 1
    : loginStep === 'face' ? 2
    : loginStep === 'code' ? 2
    : loginStep === 'forgot' ? 2
    : loginStep === 'newpassword' ? 2
    : 3;

  return (
    <div className="min-h-screen bg-forest-deep flex flex-col">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-gold/20">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(31,58,46,0.4), rgba(20,36,25,0.9)), url("https://images.pexels.com/photos/29976380/pexels-photo-29976380.jpeg?auto=compress&cs=tinysrgb&h=650&w=940")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative px-6 py-5 flex items-center justify-center gap-3">
          <Library size={26} className="text-gold" />
          <div className="text-center">
            <h1 className="font-serif-display text-xl sm:text-2xl text-parchment tracking-wide">
              Biblioteca de Literatura Clássica Inglesa
            </h1>
            <p className="font-body text-xs sm:text-sm text-gold/80 italic tracking-wider">
              Classical English Literature Library
            </p>
          </div>
          <BookOpen size={26} className="text-gold opacity-0 sm:opacity-100" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className={`w-full ${isLoggedIn ? 'max-w-3xl' : 'max-w-lg'}`}>
          <div className="bg-parchment rounded-2xl shadow-2xl border border-gold/30 overflow-hidden">
            {/* Step indicator strip (hidden when logged into dashboard) */}
            {!isLoggedIn && (
              <div className="border-b border-gold/20 bg-parchment-dark/40 px-6 py-5">
                <StepIndicator
                  current={mode === 'register' ? regStepNum : loginStepNum}
                  labels={mode === 'register' ? regLabels : loginLabels}
                />
              </div>
            )}

            {/* Mode toggle (only on first steps) */}
            {((mode === 'register' && regStep === 'form') ||
              (mode === 'login' && loginStep === 'form')) && (
              <div className="flex border-b border-gold/15 bg-parchment-dark/20">
                <button
                  type="button"
                  onClick={switchToRegister}
                  className={`flex-1 py-3 font-serif-display text-base tracking-wide transition-all ${
                    mode === 'register'
                      ? 'text-bordo border-b-2 border-gold bg-white/40'
                      : 'text-ink/40 hover:text-ink/60'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={switchToLogin}
                  className={`flex-1 py-3 font-serif-display text-base tracking-wide transition-all ${
                    mode === 'login'
                      ? 'text-bordo border-b-2 border-gold bg-white/40'
                      : 'text-ink/40 hover:text-ink/60'
                  }`}
                >
                  I have an account
                </button>
              </div>
            )}

            {/* Content */}
            <div className="px-6 sm:px-10 py-8 sm:py-10">
              {/* === REGISTRATION === */}
              {mode === 'register' && regStep === 'form' && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Join the Library
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Create your reader's account to begin
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <RegisterForm onRegistered={handleRegistered} />
                  </div>
                </>
              )}

              {mode === 'register' && regStep === 'face' && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Verify Your Face
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Step 2 of 3 — A quick photo for secure verification
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <FaceCapture onComplete={handleFaceComplete} />
                  </div>
                </>
              )}

              {mode === 'register' && regStep === 'success' && (
                <div className="py-4">
                  <SuccessScreen onDone={handleRegDone} />
                </div>
              )}

              {/* === LOGIN === */}
              {mode === 'login' && loginStep === 'form' && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Welcome Back
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Sign in — we'll send a verification code to your phone
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <LoginForm
                      onCodeSent={handleCodeSent}
                      onSwitchToRegister={switchToRegister}
                      onSwitchToFaceLogin={handleSwitchToFaceLogin}
                      onSwitchToForgotPassword={handleSwitchToForgotPassword}
                      sessionExpired={sessionExpiredMsg}
                    />
                  </div>
                </>
              )}

              {mode === 'login' && loginStep === 'face' && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Face Recognition
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Look into the camera to sign in instantly
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <FaceLogin
                      onVerified={handleFaceLoginVerified}
                      onBack={handleFaceLoginBack}
                      onUseEmailLogin={handleFaceLoginBack}
                    />
                  </div>
                </>
              )}

              {mode === 'login' && loginStep === 'forgot' && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Forgot Password
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Verify your identity with face recognition to reset your password
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <ForgotPassword onBack={handleForgotPasswordBack} />
                  </div>
                </>
              )}

              {mode === 'login' && loginStep === 'newpassword' && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Set a New Password
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Choose a new password for your account
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <NewPasswordScreen onBack={handleNewPasswordBack} />
                  </div>
                </>
              )}

              {mode === 'login' && loginStep === 'code' && confirmationResult && (
                <>
                  <div className="text-center mb-7 animate-fade-up">
                    <h2 className="font-serif-display text-3xl sm:text-4xl text-bordo mb-2">
                      Enter Your Code
                    </h2>
                    <p className="ornament-line max-w-xs mx-auto">
                      <span className="font-serif-display text-lg">❦</span>
                    </p>
                    <p className="font-body text-base text-ink/60 mt-2">
                      Step 2 of 3 — Check your text messages
                    </p>
                  </div>
                  <div className="animate-fade-up delay-100">
                    <CodeConfirm
                      confirmationResult={confirmationResult}
                      maskedPhone={maskedPhone}
                      phone={phone}
                      onVerified={handleCodeVerified}
                      onResend={handleResend}
                      onBack={() => setLoginStep('form')}
                    />
                  </div>
                </>
              )}

              {mode === 'login' && loginStep === 'welcome' && userProfile && (
                <Dashboard
                  profile={userProfile}
                  onProfileUpdated={(updated) => setUserProfile(updated)}
                  onSignOut={handleSignOut}
                />
              )}
            </div>
          </div>

          <p className="text-center mt-6 font-body text-xs text-parchment/40 tracking-wide">
            Your details are kept private and secure · Supabase Auth + Firebase Phone Verification
          </p>
        </div>
      </main>

      {/* Session timeout warning modal */}
      {showWarning && (
        <SessionWarningModal
          secondsRemaining={secondsRemaining}
          onStayConnected={stayConnected}
        />
      )}
    </div>
  );
}
