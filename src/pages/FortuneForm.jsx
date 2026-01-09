import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { calculateFate } from '../api/fateApi';
import { getCategoryById, requiresBirthTime, requiresGender, requiresBirthDate } from '../utils/categories';
import { getZodiacOptions, getConstellationOptions } from '../utils/zodiacSigns';
import './FortuneForm.css';

const FortuneForm = () => {
  const { categoryId } = useParams();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [partnerBirthTime, setPartnerBirthTime] = useState('');
  const [partnerGender, setPartnerGender] = useState('');
  const [zodiacYear, setZodiacYear] = useState('');
  const [constellation, setConstellation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const category = getCategoryById(categoryId, t);

  useEffect(() => {
    if (!category) {
      navigate('/home');
    }
  }, [category, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await calculateFate(
        birthDate,
        birthTime,
        gender,
        language,
        categoryId,
        partnerBirthDate,
        partnerBirthTime,
        partnerGender,
        zodiacYear,
        constellation
      );

      if (response && response.success) {
        // 결과 페이지로 이동
        navigate(`/fortune/result/${response.id}`, { 
          state: { 
            result: response.data,
            category: categoryId
          } 
        });
      } else {
        const errorMsg = response?.error || response?.message || t('home.calculationFailed');
        setError(errorMsg);
      }
    } catch (err) {
      console.error('API 호출 오류:', err);
      const errorMsg = err.response?.data?.error 
        || err.response?.data?.message 
        || err.message 
        || t('home.serverError');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!category) {
    return null;
  }

  return (
    <div className="fortune-form-page">
      <button onClick={() => navigate('/home')} className="back-btn">
        ← {t('common.backToCategories')}
      </button>

      <div className="form-header">
        <span className="category-icon-large">{category.icon}</span>
        <h2>{category.label}</h2>
      </div>

      <form onSubmit={handleSubmit} className="fortune-form">
        {requiresBirthDate(categoryId) && (
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
        )}

        {requiresBirthTime(categoryId) && (
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

            {requiresGender(categoryId) && (
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
            )}
          </>
        )}

        {categoryId === 'compatibility' && (
          <>
            <div className="form-divider">{t('home.partnerInfo')}</div>
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

        {categoryId === 'zodiac' && (
          <div className="form-group">
            <label htmlFor="zodiacYear">{t('home.zodiacYear')}</label>
            <select
              id="zodiacYear"
              value={zodiacYear}
              onChange={(e) => setZodiacYear(e.target.value)}
              required
            >
              <option value="">{t('home.zodiacYear')}</option>
              {getZodiacOptions(t).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        )}

        {categoryId === 'constellation' && (
          <div className="form-group">
            <label htmlFor="constellation">{t('home.constellationSelect')}</label>
            <select
              id="constellation"
              value={constellation}
              onChange={(e) => setConstellation(e.target.value)}
              required
            >
              <option value="">{t('home.constellationSelect')}</option>
              {getConstellationOptions(t).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? t('home.calculating') : t('home.calculate')}
        </button>
      </form>
    </div>
  );
};

export default FortuneForm;
