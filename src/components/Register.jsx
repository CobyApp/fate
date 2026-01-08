import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './Auth.css';

const Register = ({ onSwitchToLogin, onRegistrationSuccess }) => {
  const { register, error } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return t('auth.passwordTooShort');
    if (!/[A-Z]/.test(pwd)) return t('auth.passwordNoUppercase');
    if (!/[a-z]/.test(pwd)) return t('auth.passwordNoLowercase');
    if (!/[0-9]/.test(pwd)) return t('auth.passwordNoNumber');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    // 비밀번호 검증
    const passwordError = validatePassword(password);
    if (passwordError) {
      setLocalError(passwordError);
      setLoading(false);
      return;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setLocalError(t('auth.passwordMismatch'));
      setLoading(false);
      return;
    }

    const result = await register(email, password, name);
    if (result.success) {
      onRegistrationSuccess(result.email);
    } else {
      setLocalError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.registerTitle')}</h2>
        <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">{t('auth.name')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=""
            />
            <small className="form-hint">
              {t('auth.passwordHint')}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder=""
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t('common.loading') : t('auth.register')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {t('auth.hasAccount')}{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-button">
              {t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
