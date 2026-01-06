import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { calculateFate, getFateHistory } from '../api/fateApi';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await calculateFate(birthDate, birthTime, gender);
      if (response.success) {
        setResult(response.data);
        // 결과를 받으면 히스토리 새로고침
        loadHistory();
      } else {
        setError(response.error || '사주 계산에 실패했습니다.');
      }
    } catch (err) {
      setError('서버에 연결할 수 없습니다. API URL을 확인해주세요.');
      console.error('API 호출 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await getFateHistory();
      if (response.success) {
        setHistory(response.data || []);
      }
    } catch (err) {
      console.error('히스토리 로드 오류:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleShowHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="home">
      <header className="home-header">
        <div className="header-content">
          <h1>Fate - 사주 보기</h1>
          <div className="header-actions">
            <button onClick={handleShowHistory} className="history-btn">
              {showHistory ? '결과 보기' : '기록 보기'}
            </button>
            <div className="user-info">
              <span className="user-email">{user?.username || user?.attributes?.email || '사용자'}</span>
              <button onClick={handleLogout} className="logout-btn">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="home-main">
        {!showHistory ? (
          <>
            <div className="welcome-section">
              <h2>안녕하세요, {user?.username || user?.attributes?.email || '사용자'}님</h2>
              <p>생년월일과 생시를 입력하시면 정확한 사주를 분석해드립니다.</p>
            </div>

            <form onSubmit={handleSubmit} className="fate-form">
              <div className="form-group">
                <label htmlFor="birthDate">생년월일</label>
                <input
                  type="date"
                  id="birthDate"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="birthTime">생시 (선택사항)</label>
                <input
                  type="time"
                  id="birthTime"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">성별</label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '계산 중...' : '사주 보기'}
              </button>
            </form>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {result && (
              <div className="result-container">
                <h2>사주 결과</h2>
                <div className="result-content">
                  <div className="result-item">
                    <span className="label">생년월일:</span>
                    <span className="value">{result.year}년 {result.month}월 {result.day}일</span>
                  </div>
                  <div className="result-item">
                    <span className="label">성별:</span>
                    <span className="value">{result.gender === 'male' ? '남성' : '여성'}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">운세:</span>
                    <span className="value fortune">{result.fortune}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">설명:</span>
                    <span className="value">{result.description}</span>
                  </div>
                  <div className="elements">
                    <h3>오행</h3>
                    <div className="elements-grid">
                      <div className="element-item">
                        <span>목(木)</span>
                        <span>{result.elements.wood}%</span>
                      </div>
                      <div className="element-item">
                        <span>화(火)</span>
                        <span>{result.elements.fire}%</span>
                      </div>
                      <div className="element-item">
                        <span>토(土)</span>
                        <span>{result.elements.earth}%</span>
                      </div>
                      <div className="element-item">
                        <span>금(金)</span>
                        <span>{result.elements.metal}%</span>
                      </div>
                      <div className="element-item">
                        <span>수(水)</span>
                        <span>{result.elements.water}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="history-section">
            <h2>사주 기록</h2>
            {historyLoading ? (
              <div className="loading">로딩 중...</div>
            ) : history.length === 0 ? (
              <div className="empty-history">아직 기록이 없습니다.</div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <span className="history-date">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      <span className="history-gender">
                        {item.gender === 'male' ? '남성' : '여성'}
                      </span>
                    </div>
                    <div className="history-birth">
                      {item.birthDate} {item.birthTime && `(${item.birthTime})`}
                    </div>
                    {item.result && (
                      <div className="history-result">
                        <span className="fortune-badge">{item.result.fortune}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
