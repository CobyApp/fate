import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './Auth.css';

const ConfirmSignUp = ({ email, onConfirmSuccess, onResendCode }) => {
  const { confirmRegistration, resendCode, error } = useAuth();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    const result = await confirmRegistration(email, code);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onConfirmSuccess();
      }, 1500);
    } else {
      setLocalError(result.error);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setLocalError(null);
    const result = await resendCode(email);
    if (result.success) {
      alert(t('auth.codeResent'));
    } else {
      setLocalError(result.error);
    }
    setResendLoading(false);
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-message">
            <h2>{t('auth.authSuccess')}</h2>
            <p>{t('auth.authRedirecting')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.confirmTitle')}</h2>
        <p className="auth-subtitle">
          {t('auth.confirmSubtitle')}
        </p>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">{t('auth.confirmTitle')}</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder=""
              maxLength="6"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t('common.loading') : t('auth.confirmTitle')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {t('auth.codeNotReceived')}{' '}
            <button
              type="button"
              onClick={handleResend}
              className="link-button"
              disabled={resendLoading}
            >
              {resendLoading ? t('common.loading') : t('auth.resendCode')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSignUp;
