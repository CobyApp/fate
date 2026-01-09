import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './Auth.css';

const ResetPassword = ({ email, onSuccess }) => {
  const { confirmForgotPassword, error } = useAuth();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setLocalError(passwordError);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(t('auth.passwordMismatch'));
      setLoading(false);
      return;
    }

    const result = await confirmForgotPassword(email, code, newPassword);
    if (result.success) {
      onSuccess();
    } else {
      setLocalError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.resetPasswordTitle')}</h2>
        <p className="auth-subtitle">{t('auth.resetPasswordSubtitle')}</p>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">{t('auth.resetCode')}</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="000000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">{t('auth.newPassword')}</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
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
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t('common.loading') : t('auth.resetPassword')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
