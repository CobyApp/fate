import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { calculateFate, getFateHistory } from '../api/fateApi';
import LanguageSelector from '../components/LanguageSelector';
import ProfileSettings from '../components/ProfileSettings';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth();
  const { t, language } = useI18n();
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await calculateFate(birthDate, birthTime, gender, language);
      if (response.success) {
        setResult(response.data);
        // 결과를 받으면 히스토리 새로고침
        loadHistory();
      } else {
        setError(response.error || t('home.calculationFailed'));
      }
    } catch (err) {
      setError(t('home.serverError'));
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

  // 사용자 이름 우선순위: 닉네임 > name > email > username
  const userName = user?.attributes?.['custom:nickname'] 
    || user?.attributes?.nickname 
    || user?.attributes?.name 
    || user?.username 
    || user?.attributes?.email 
    || 'User';

  return (
    <div className="home">
      <header className="home-header">
        <div className="header-content">
          <h1>{t('home.title')}</h1>
          <div className="header-actions">
            <LanguageSelector />
            <button onClick={handleShowHistory} className="history-btn">
              {showHistory ? t('home.result') : t('home.history')}
            </button>
            <div className="user-info">
              <button onClick={() => setShowProfileSettings(true)} className="profile-btn">
                {t('auth.profile')}
              </button>
              <span className="user-email">{userName}</span>
              <button onClick={handleLogout} className="logout-btn">
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="home-main">
        {!showHistory ? (
          <div className="home-content">
            <div className="welcome-section">
              <h2>{t('home.welcome', { name: userName })}</h2>
              <p>{t('home.description')}</p>
            </div>

            <div className="form-result-wrapper">
              <form onSubmit={handleSubmit} className="fate-form">
                <div className="form-group">
                  <label htmlFor="birthDate">{t('home.birthDate')}</label>
                  <input
                    type="date"
                    id="birthDate"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="birthTime">{t('home.birthTime')}</label>
                  <input
                    type="time"
                    id="birthTime"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">{t('home.gender')}</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                  >
                    <option value="">{t('home.genderSelect')}</option>
                    <option value="male">{t('home.male')}</option>
                    <option value="female">{t('home.female')}</option>
                  </select>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? t('home.calculating') : t('home.calculate')}
                </button>
              </form>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {result && (
                <div className="result-container">
                  <h2>{t('home.resultTitle')}</h2>
                  <div className="result-content">
                    <div className="result-item">
                      <span className="label">{t('home.resultBirthDate')}</span>
                      <span className="value">{result.year}년 {result.month}월 {result.day}일</span>
                    </div>
                    <div className="result-item">
                      <span className="label">{t('home.resultGender')}</span>
                      <span className="value">{result.gender === 'male' ? t('home.male') : t('home.female')}</span>
                    </div>
                    <div className="result-item">
                      <span className="label">{t('home.fortune')}</span>
                      <span className="value fortune">{result.fortune}</span>
                    </div>
                    <div className="result-item">
                      <span className="label">{t('home.description')}</span>
                      <span className="value">{result.description}</span>
                    </div>
                    <div className="elements">
                      <h3>{t('home.elements')}</h3>
                      <div className="elements-grid">
                        <div className="element-item">
                          <span>{t('home.wood')}</span>
                          <span>{result.elements.wood}%</span>
                        </div>
                        <div className="element-item">
                          <span>{t('home.fire')}</span>
                          <span>{result.elements.fire}%</span>
                        </div>
                        <div className="element-item">
                          <span>{t('home.earth')}</span>
                          <span>{result.elements.earth}%</span>
                        </div>
                        <div className="element-item">
                          <span>{t('home.metal')}</span>
                          <span>{result.elements.metal}%</span>
                        </div>
                        <div className="element-item">
                          <span>{t('home.water')}</span>
                          <span>{result.elements.water}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="history-section">
            <h2>{t('home.historyTitle')}</h2>
            {historyLoading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : history.length === 0 ? (
              <div className="empty-history">{t('home.noHistory')}</div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <span className="history-date">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="history-gender">
                        {item.gender === 'male' ? t('home.male') : t('home.female')}
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

      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}
    </div>
  );
};

export default Home;
