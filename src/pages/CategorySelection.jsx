import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { getAllCategories } from '../utils/categories';
import './CategorySelection.css';

const CategorySelection = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const categories = getAllCategories(t);

  const handleCategoryClick = (categoryId) => {
    navigate(`/fortune/${categoryId}`);
  };

  return (
    <div className="category-selection-page">
      <div className="welcome-section">
        <h2>{t('home.selectCategory')}</h2>
      </div>
      <div className="category-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-card" 
            onClick={() => handleCategoryClick(category.id)}
          >
            <span className="category-icon">{category.icon}</span>
            <h3>{category.label}</h3>
            <p>{category.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySelection;
