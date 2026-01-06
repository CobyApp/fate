import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const ConfirmSignUp = ({ email, onConfirmSuccess, onResendCode }) => {
  const { confirmRegistration, resendCode, error } = useAuth();
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
      alert('인증 코드가 재전송되었습니다. 이메일을 확인해주세요.');
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
            <h2>인증 완료!</h2>
            <p>로그인 페이지로 이동합니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>이메일 인증</h2>
        <p className="auth-subtitle">
          {email}로 전송된 인증 코드를 입력하세요
        </p>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">인증 코드</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="6자리 인증 코드"
              maxLength="6"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '인증 중...' : '인증하기'}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            코드를 받지 못하셨나요?{' '}
            <button
              type="button"
              onClick={handleResend}
              className="link-button"
              disabled={resendLoading}
            >
              {resendLoading ? '재전송 중...' : '코드 재전송'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSignUp;
