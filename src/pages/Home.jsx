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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [partnerBirthTime, setPartnerBirthTime] = useState('');
  const [partnerGender, setPartnerGender] = useState('');
  const [zodiacYear, setZodiacYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const categories = [
    { id: 'tojeong', label: t('home.tojeong'), desc: t('home.tojeongDesc'), icon: '📜' },
    { id: 'saju', label: t('home.saju'), desc: t('home.sajuDesc'), icon: '🔮' },
    { id: 'compatibility', label: t('home.compatibility'), desc: t('home.compatibilityDesc'), icon: '💕' },
    { id: 'love', label: t('home.love'), desc: t('home.loveDesc'), icon: '💖' },
    { id: 'today', label: t('home.today'), desc: t('home.todayDesc'), icon: '✨' },
    { id: 'zodiac', label: t('home.zodiac'), desc: t('home.zodiacDesc'), icon: '🐉' },
    { id: 'newyear', label: t('home.newyear'), desc: t('home.newyearDesc'), icon: '🎊' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await calculateFate(
        birthDate, 
        birthTime, 
        gender, 
        language, 
        selectedCategory,
        partnerBirthDate,
        partnerBirthTime,
        partnerGender,
        zodiacYear
      );
      if (response.success) {
        setResult(response.data);
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
          <div className="header-left">
            <h1 className="logo">{t('home.title')}</h1>
          </div>
          <nav className="header-nav">
            <button 
              onClick={handleShowHistory} 
              className={`nav-btn ${showHistory ? 'active' : ''}`}
            >
              {showHistory ? t('home.result') : t('home.history')}
            </button>
            <button 
              onClick={() => setShowProfileSettings(true)} 
              className="nav-btn"
            >
              {t('auth.profile')}
            </button>
            <div className="user-menu">
              <span className="user-name">{userName}</span>
              <button onClick={handleLogout} className="logout-btn">
                {t('auth.logout')}
              </button>
            </div>
            <LanguageSelector />
          </nav>
        </div>
      </header>

      <main className="home-main">
        {!showHistory ? (
          <div className="home-content">
            {!selectedCategory ? (
              <>
                <div className="welcome-section">
                  <h2>{t('home.welcome', { name: userName })}</h2>
                  <p>{t('home.description')}</p>
                </div>

                <div className="categories-section">
                  <h3 className="section-title">{t('home.selectCategory')}</h3>
                  <div className="categories-grid">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="category-card"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <div className="category-icon">{category.icon}</div>
                        <h4 className="category-title">{category.label}</h4>
                        <p className="category-desc">{category.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="fortune-form-section">
                <div className="form-header">
                  <button onClick={() => setSelectedCategory(null)} className="back-btn">
                    ← {t('home.back')}
                  </button>
                  <h2>{categories.find(c => c.id === selectedCategory)?.label}</h2>
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
                        required={selectedCategory !== 'today'}
                      />
                    </div>

                    {selectedCategory !== 'today' && selectedCategory !== 'zodiac' && (
                      <>
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
                      </>
                    )}

                    {selectedCategory === 'compatibility' && (
                      <>
                        <div className="form-divider">상대방 정보</div>
                        <div className="form-group">
                          <label htmlFor="partnerBirthDate">{t('home.partnerBirthDate')}</label>
                          <input
                            type="date"
                            id="partnerBirthDate"
                            value={partnerBirthDate}
                            onChange={(e) => setPartnerBirthDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="partnerBirthTime">{t('home.partnerBirthTime')}</label>
                          <input
                            type="time"
                            id="partnerBirthTime"
                            value={partnerBirthTime}
                            onChange={(e) => setPartnerBirthTime(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="partnerGender">{t('home.partnerGender')}</label>
                          <select
                            id="partnerGender"
                            value={partnerGender}
                            onChange={(e) => setPartnerGender(e.target.value)}
                            required
                          >
                            <option value="">{t('home.genderSelect')}</option>
                            <option value="male">{t('home.male')}</option>
                            <option value="female">{t('home.female')}</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedCategory === 'zodiac' && (
                      <div className="form-group">
                        <label htmlFor="zodiacYear">{t('home.zodiacYear')}</label>
                        <select
                          id="zodiacYear"
                          value={zodiacYear}
                          onChange={(e) => setZodiacYear(e.target.value)}
                          required
                        >
                          <option value="">선택하세요</option>
                          <option value="rat">쥐띠 (子)</option>
                          <option value="ox">소띠 (丑)</option>
                          <option value="tiger">호랑이띠 (寅)</option>
                          <option value="rabbit">토끼띠 (卯)</option>
                          <option value="dragon">용띠 (辰)</option>
                          <option value="snake">뱀띠 (巳)</option>
                          <option value="horse">말띠 (午)</option>
                          <option value="goat">양띠 (未)</option>
                          <option value="monkey">원숭이띠 (申)</option>
                          <option value="rooster">닭띠 (酉)</option>
                          <option value="dog">개띠 (戌)</option>
                          <option value="pig">돼지띠 (亥)</option>
                        </select>
                      </div>
                    )}

                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? t('home.calculating') : t('home.calculate')}
                    </button>
                  </form>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  {result && (
                    <div className="result-container">
                      <div className="result-header">
                        <h2>{t('home.resultTitle')}</h2>
                        {result.category && (
                          <div className="category-badge">
                            {categories.find(c => c.id === result.category)?.label}
                          </div>
                        )}
                      </div>
                      
                      {result.fortune && (
                        <div className="result-badge">
                          <span className="fortune-badge-main">{result.fortune}</span>
                        </div>
                      )}
                      
                      {(result.year || result.birthDate) && (
                        <div className="result-info-card">
                          <div className="info-row">
                            {result.year && (
                              <div className="info-item">
                                <span className="info-label">{t('home.resultBirthDate')}</span>
                                <span className="info-value">{result.year}년 {result.month}월 {result.day}일</span>
                              </div>
                            )}
                            {result.gender && (
                              <div className="info-item">
                                <span className="info-label">{t('home.resultGender')}</span>
                                <span className="info-value gender-badge">
                                  {result.gender === 'male' ? '♂' : '♀'} {result.gender === 'male' ? t('home.male') : t('home.female')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="result-description-card">
                        <h3 className="description-title">
                          {t('home.description')}
                        </h3>
                        <p className="description-text">{result.description}</p>
                      </div>

                      {result.elements && (
                        <div className="elements-section">
                          <h3 className="elements-title">
                            {t('home.elements')}
                          </h3>
                          <div className="elements-container">
                            {result.elements.wood && (
                              <div className="element-card" data-element="wood">
                                <div className="element-header">
                                  <span className="element-name">{t('home.wood')}</span>
                                  <span className="element-percent">{result.elements.wood}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${result.elements.wood}%`, backgroundColor: 'var(--wood)' }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {result.elements.fire && (
                              <div className="element-card" data-element="fire">
                                <div className="element-header">
                                  <span className="element-name">{t('home.fire')}</span>
                                  <span className="element-percent">{result.elements.fire}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${result.elements.fire}%`, backgroundColor: 'var(--fire)' }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {result.elements.earth && (
                              <div className="element-card" data-element="earth">
                                <div className="element-header">
                                  <span className="element-name">{t('home.earth')}</span>
                                  <span className="element-percent">{result.elements.earth}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${result.elements.earth}%`, backgroundColor: 'var(--earth)' }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {result.elements.metal && (
                              <div className="element-card" data-element="metal">
                                <div className="element-header">
                                  <span className="element-name">{t('home.metal')}</span>
                                  <span className="element-percent">{result.elements.metal}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${result.elements.metal}%`, backgroundColor: 'var(--metal)' }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {result.elements.water && (
                              <div className="element-card" data-element="water">
                                <div className="element-header">
                                  <span className="element-name">{t('home.water')}</span>
                                  <span className="element-percent">{result.elements.water}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ width: `${result.elements.water}%`, backgroundColor: 'var(--water)' }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                    {item.category && (
                      <div className="history-category">
                        <span className="category-tag">{categories.find(c => c.id === item.category)?.label || item.category}</span>
                      </div>
                    )}
                    {item.result && (
                      <div className="history-result">
                        {item.result.fortune && (
                          <span className="fortune-badge">{item.result.fortune}</span>
                        )}
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
