import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { calculateFate } from '../api/fateApi';
import './FortuneResult.css';

const FortuneResult = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [result, setResult] = useState(location.state?.result || null);
  const [categoryId] = useState(location.state?.category || null);

  useEffect(() => {
    if (!result && id) {
      // 필요시 ID로 결과를 다시 가져올 수 있음
      // 현재는 location.state에서 가져온 결과를 사용
    }
  }, [id, result]);

  if (!result) {
    return (
      <div className="fortune-result-page">
        <div className="error-container">
          <p>{t('home.noResult')}</p>
          <button onClick={() => navigate('/home')} className="back-btn">
            ← {t('common.backToCategories')}
          </button>
        </div>
      </div>
    );
  }

  const categories = {
    tojeong: { label: t('home.tojeong'), icon: '📜' },
    saju: { label: t('home.saju'), icon: '🔮' },
    compatibility: { label: t('home.compatibility'), icon: '💕' },
    love: { label: t('home.love'), icon: '💖' },
    today: { label: t('home.today'), icon: '✨' },
    zodiac: { label: t('home.zodiac'), icon: '🐉' },
    newyear: { label: t('home.newyear'), icon: '🎊' }
  };

  const category = categories[categoryId] || categories[result.category] || { label: '', icon: '' };

  return (
    <div className="fortune-result-page">
      <div className="result-header">
        <button onClick={() => navigate('/home')} className="back-btn">
          ← {t('common.backToCategories')}
        </button>
        <button onClick={() => navigate('/history')} className="history-btn">
          {t('home.viewHistory')} →
        </button>
      </div>

      <div className="result-container">
        <div className="result-title-section">
          <span className="category-icon-large">{category.icon}</span>
          {category.label && (
            <div className="category-badge">
              {category.label}
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
                    {result.gender === 'male' ? t('home.male') : t('home.female')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {result.elements && (
          <div className="elements-section">
            <h3>{t('home.fiveElements')}</h3>
            <div className="elements-grid">
              {Object.entries(result.elements).map(([element, value]) => (
                <div key={element} className="element-item">
                  <div className="element-label">
                    {element === 'wood' && '목'}
                    {element === 'fire' && '화'}
                    {element === 'earth' && '토'}
                    {element === 'metal' && '금'}
                    {element === 'water' && '수'}
                  </div>
                  <div className="element-bar">
                    <div 
                      className="element-fill" 
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="element-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.description && (
          <div className="description-section">
            <h3>{t('home.detailedDescription')}</h3>
            <div className="description-content">
              {result.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        <div className="result-actions">
          <button onClick={() => navigate('/home')} className="action-btn primary">
            {t('home.newFortune')}
          </button>
          <button onClick={() => navigate('/history')} className="action-btn secondary">
            {t('home.viewHistory')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FortuneResult;
