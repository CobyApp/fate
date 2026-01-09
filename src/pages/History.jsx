import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { getFateHistory } from '../api/fateApi';
import { getAllCategories } from '../utils/categories';
import './History.css';

const History = () => {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFateHistory();
      if (response && response.success) {
        setHistory(response.data || []);
      } else {
        setError(response?.error || t('home.historyLoadFailed'));
      }
    } catch (err) {
      console.error('기록 로드 오류:', err);
      setError(err.message || t('home.serverError'));
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 색상 매핑
  const categoryColors = {
    tojeong: '#8B5CF6',
    saju: '#6366F1',
    compatibility: '#EC4899',
    love: '#F43F5E',
    constellation: '#F59E0B',
    money: '#10B981',
    health: '#06B6D4',
    career: '#3B82F6',
    study: '#8B5CF6',
    relationship: '#14B8A6',
    today: '#F59E0B',
    zodiac: '#EF4444',
    newyear: '#EC4899'
  };

  const allCategories = getAllCategories(t);
  const categories = allCategories.reduce((acc, cat) => {
    acc[cat.id] = { ...cat, color: categoryColors[cat.id] || '#6B7280' };
    return acc;
  }, {});

  const handleResultClick = (item) => {
    navigate(`/fortune/result/${item.id}`, {
      state: {
        result: item.result || item,
        category: item.category
      }
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return t('home.historyPage.today') + ' ' + date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (isYesterday) {
      return t('home.historyPage.yesterday') + ' ' + date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return t('home.historyPage.justNow');
    if (minutes < 60) return `${minutes}${t('home.historyPage.minutesAgo')}`;
    if (hours < 24) return `${hours}${t('home.historyPage.hoursAgo')}`;
    if (days < 7) return `${days}${t('home.historyPage.daysAgo')}`;
    return formatDate(timestamp);
  };

  const filteredHistory = selectedCategory === 'all' 
    ? history 
    : history.filter(item => item.category === selectedCategory);

  const categoryCounts = history.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="history-title-section">
          <h1 className="history-title">{t('home.historyTitle')}</h1>
          <p className="history-subtitle">{history.length}{t('home.historyPage.records')}</p>
        </div>
        <button onClick={loadHistory} className="refresh-btn" disabled={loading}>
          <span className="refresh-icon">↻</span>
          {t('common.refresh')}
        </button>
      </div>

      {/* 카테고리 필터 */}
      {history.length > 0 && (
        <div className="history-filters">
          <button 
            className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            {t('home.historyPage.all')} ({history.length})
          </button>
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const catInfo = categories[cat] || { label: t('home.unknownCategory'), icon: '📜', color: '#6B7280' };
            return (
              <button
                key={cat}
                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ '--category-color': catInfo.color }}
              >
                <span className="filter-icon">{catInfo.icon}</span>
                {catInfo.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner">{t('common.loading')}</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!loading && !error && filteredHistory.length === 0 && history.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h3 className="empty-title">{t('home.historyPage.noRecords')}</h3>
          <p className="empty-description">{t('home.historyPage.noRecordsDesc')}</p>
          <button onClick={() => navigate('/home')} className="empty-action-btn">
            {t('home.newFortune')}
          </button>
        </div>
      )}

      {!loading && !error && filteredHistory.length === 0 && history.length > 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3 className="empty-title">{t('home.historyPage.noFilteredRecords')}</h3>
          <button onClick={() => setSelectedCategory('all')} className="empty-action-btn">
            {t('home.historyPage.showAll')}
          </button>
        </div>
      )}

      {!loading && !error && filteredHistory.length > 0 && (
        <div className="history-grid">
          {filteredHistory.map((item) => {
            const category = categories[item.category] || { label: t('home.unknownCategory'), icon: '📜', color: '#6B7280' };
            const result = item.result || item;
            return (
              <div 
                key={item.id} 
                className="history-card"
                onClick={() => handleResultClick(item)}
              >
                <div className="history-card-header" style={{ '--category-color': category.color }}>
                  <div className="category-badge" style={{ backgroundColor: category.color + '15', color: category.color }}>
                    <span className="category-icon-small">{category.icon}</span>
                    <span className="category-name">{category.label}</span>
                  </div>
                  <span className="history-time">{formatRelativeTime(item.createdAt)}</span>
                </div>
                
                {result.fortune && (
                  <div className="history-card-fortune">
                    {result.fortune}
                  </div>
                )}

                {result.description && (
                  <div className="history-card-description">
                    {result.description.substring(0, 100)}...
                  </div>
                )}

                <div className="history-card-footer">
                  {(result.year || item.birthDate) && (
                    <div className="history-card-meta">
                      {result.year && (
                        <span className="meta-item">
                          📅 {result.year}년 {result.month || ''}월 {result.day || ''}일
                        </span>
                      )}
                      {result.gender && (
                        <span className="meta-item">
                          {result.gender === 'male' ? '♂' : '♀'} {result.gender === 'male' ? t('home.male') : t('home.female')}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="view-detail">
                    {t('home.historyPage.viewDetail')} →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
