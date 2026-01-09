import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './Auth.css';

const ForgotPassword = ({ onBackToLogin, onCodeSent }) => {
  const { forgotPassword, error } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    const result = await forgotPassword(email);
    if (result.success) {
      onCodeSent(result.email);
    } else {
      setLocalError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.forgotPasswordTitle')}</h2>
        <p className="auth-subtitle">{t('auth.forgotPasswordSubtitle')}</p>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t('common.loading') : t('auth.sendResetCode')}
          </button>
        </form>

        <div className="auth-switch">
          <button type="button" onClick={onBackToLogin} className="link-button">
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
