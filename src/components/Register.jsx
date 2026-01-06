import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = ({ onSwitchToLogin, onRegistrationSuccess }) => {
  const { register, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.';
    if (!/[A-Z]/.test(pwd)) return '비밀번호에 대문자가 포함되어야 합니다.';
    if (!/[a-z]/.test(pwd)) return '비밀번호에 소문자가 포함되어야 합니다.';
    if (!/[0-9]/.test(pwd)) return '비밀번호에 숫자가 포함되어야 합니다.';
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
      setLocalError('비밀번호가 일치하지 않습니다.');
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
        <h2>회원가입</h2>
        <p className="auth-subtitle">새 계정을 만드세요</p>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">이름 (선택사항)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일</label>
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
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="최소 8자, 대소문자, 숫자 포함"
            />
            <small className="form-hint">
              최소 8자 이상, 대문자, 소문자, 숫자 포함
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            이미 계정이 있으신가요?{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-button">
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
