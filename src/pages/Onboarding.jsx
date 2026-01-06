import { useState } from 'react';
import Login from '../components/Login';
import Register from '../components/Register';
import ConfirmSignUp from '../components/ConfirmSignUp';
import './Onboarding.css';

const Onboarding = () => {
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
      <div className="onboarding-hero">
        <div className="hero-content">
          <h1 className="hero-title">Fate</h1>
          <h2 className="hero-subtitle">당신의 운명을 알아보세요</h2>
          <p className="hero-description">
            전통 사주 명리학을 바탕으로 당신의 운세를 분석하고<br />
            인생의 중요한 순간을 미리 준비하세요
          </p>
          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">🔮</span>
              <span>정확한 사주 분석</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>오행 균형 분석</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <span>기록 관리</span>
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
  );
};

export default Onboarding;
