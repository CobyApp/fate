import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import Login from '../components/Login';
import Register from '../components/Register';
import ConfirmSignUp from '../components/ConfirmSignUp';
import ForgotPassword from '../components/ForgotPassword';
import ResetPassword from '../components/ResetPassword';
import LanguageSelector from '../components/LanguageSelector';
import './Onboarding.css';

const Onboarding = () => {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'confirm', 'forgot-password', 'reset-password'
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleRegistrationSuccess = async (result) => {
    // result는 { success: true, email, autoSignedIn } 형태
    console.log('회원가입 성공 처리:', result);
    
    // autoSignIn이 성공한 경우 바로 홈으로 이동
    if (result.autoSignedIn) {
      // 이미 로그인된 상태이므로 바로 홈으로 이동
      navigate('/home');
      return;
    }
    
    // autoSignIn이 실패했지만 회원가입은 성공한 경우
    // Lambda Trigger가 계정을 활성화했으므로 잠시 대기 후 홈으로 이동
    // 또는 사용자에게 로그인하도록 안내
    if (result.needsLogin) {
      // 회원가입은 성공했지만 로그인에 실패한 경우
      // Lambda Trigger가 처리할 시간을 주고 홈으로 이동 (이미 인증됨)
      setTimeout(() => {
        navigate('/home');
      }, 1500);
      return;
    }
    
    // 기본적으로 홈으로 이동 (Lambda Trigger가 계정을 활성화했을 것으로 예상)
    setTimeout(() => {
      navigate('/home');
    }, 1000);
  };

  const handleConfirmSuccess = () => {
    setMode('login');
    setRegisteredEmail('');
  };

  const handleForgotPasswordClick = () => {
    setMode('forgot-password');
  };

  const handleCodeSent = (email) => {
    setResetEmail(email);
    setMode('reset-password');
  };

  const handleResetSuccess = () => {
    setMode('login');
    setResetEmail('');
  };

  return (
    <div className="onboarding">
      <div className="language-selector-wrapper">
        <LanguageSelector />
      </div>
      
      <div className="onboarding-container">
        <div className="onboarding-hero">
          <div className="hero-content">
            <h1 className="hero-title">{t('onboarding.title')}</h1>
            <h2 className="hero-subtitle">{t('onboarding.subtitle')}</h2>
            <p className="hero-description">
              {t('onboarding.description').split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < t('onboarding.description').split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
            <div className="hero-features">
              <div className="feature-item">
                <span className="feature-icon">🔮</span>
                <span>{t('onboarding.feature1')}</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>{t('onboarding.feature2')}</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📝</span>
                <span>{t('onboarding.feature3')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="onboarding-auth">
          {mode === 'login' && (
            <Login 
              onSwitchToRegister={() => setMode('register')}
              onForgotPassword={handleForgotPasswordClick}
            />
          )}
          {mode === 'register' && (
            <Register
              onSwitchToLogin={() => setMode('login')}
              onRegistrationSuccess={handleRegistrationSuccess}
            />
          )}
          {mode === 'confirm' && (
            <ConfirmSignUp
              email={registeredEmail}
              onConfirmSuccess={handleConfirmSuccess}
              onResendCode={() => {}}
            />
          )}
          {mode === 'forgot-password' && (
            <ForgotPassword
              onBackToLogin={() => setMode('login')}
              onCodeSent={handleCodeSent}
            />
          )}
          {mode === 'reset-password' && (
            <ResetPassword
              email={resetEmail}
              onSuccess={handleResetSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
