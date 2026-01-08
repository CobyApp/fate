import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import Login from '../components/Login';
import Register from '../components/Register';
import ConfirmSignUp from '../components/ConfirmSignUp';
import LanguageSelector from '../components/LanguageSelector';
import './Onboarding.css';

const Onboarding = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'confirm'
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleRegistrationSuccess = (email) => {
    setRegisteredEmail(email);
    setMode('confirm');
  };

  const handleConfirmSuccess = () => {
    setMode('login');
    setRegisteredEmail('');
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
            <Login onSwitchToRegister={() => setMode('register')} />
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
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
