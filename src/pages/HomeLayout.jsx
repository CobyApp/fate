import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import LanguageSelector from '../components/LanguageSelector';
import { useState } from 'react';
import './HomeLayout.css';

const HomeLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 사용자 이름 우선순위: 닉네임 > name > email > username
  const userName = user?.attributes?.['custom:nickname'] 
    || user?.attributes?.nickname 
    || user?.attributes?.name 
    || user?.username 
    || user?.attributes?.email 
    || 'User';

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="home-layout">
      {/* 데스크톱: 왼쪽 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo" onClick={() => navigate('/home')}>
            {t('home.title')}
          </h1>
        </div>
        <nav className="sidebar-nav">
          <button 
            onClick={() => navigate('/home')} 
            className={`nav-item ${isActive('/home') ? 'active' : ''}`}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">{t('home.home')}</span>
          </button>
          <button 
            onClick={() => navigate('/history')} 
            className={`nav-item ${isActive('/history') ? 'active' : ''}`}
          >
            <span className="nav-icon">📜</span>
            <span className="nav-label">{t('home.viewHistory')}</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{userName}</div>
              <div className="user-email">{user?.attributes?.email || ''}</div>
            </div>
          </div>
          <LanguageSelector />
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 영역 */}
      <div className="main-content">
        {/* 모바일: 상단 헤더 */}
        <header className="mobile-header">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1 className="mobile-logo" onClick={() => navigate('/home')}>
            {t('home.title')}
          </h1>
        </header>

        {/* 모바일: 사이드바 오버레이 */}
        {sidebarOpen && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}>
            <aside className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-sidebar-header">
                <h1 className="logo">{t('home.title')}</h1>
                <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
              </div>
              <nav className="mobile-sidebar-nav">
                <button 
                  onClick={() => { navigate('/home'); setSidebarOpen(false); }} 
                  className={`nav-item ${isActive('/home') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🏠</span>
                  <span className="nav-label">{t('home.home')}</span>
                </button>
                <button 
                  onClick={() => { navigate('/history'); setSidebarOpen(false); }} 
                  className={`nav-item ${isActive('/history') ? 'active' : ''}`}
                >
                  <span className="nav-icon">📜</span>
                  <span className="nav-label">{t('home.viewHistory')}</span>
                </button>
              </nav>
              <div className="mobile-sidebar-footer">
                <div className="user-info" onClick={() => { navigate('/profile'); setSidebarOpen(false); }} style={{ cursor: 'pointer' }}>
                  <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                  <div className="user-details">
                    <div className="user-name">{userName}</div>
                    <div className="user-email">{user?.attributes?.email || ''}</div>
                  </div>
                </div>
                <LanguageSelector />
                <button onClick={handleLogout} className="logout-btn">
                  <span className="nav-icon">🚪</span>
                  <span className="nav-label">{t('auth.logout')}</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="home-main">
          {children}
        </main>

        {/* 모바일: 하단 네비게이션 바 */}
        <nav className="bottom-nav">
          <button 
            onClick={() => navigate('/home')} 
            className={`bottom-nav-item ${isActive('/home') ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">🏠</span>
            <span className="bottom-nav-label">{t('home.home')}</span>
          </button>
          <button 
            onClick={() => navigate('/history')} 
            className={`bottom-nav-item ${isActive('/history') ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">📜</span>
            <span className="bottom-nav-label">{t('home.viewHistory')}</span>
          </button>
          <button 
            onClick={() => navigate('/profile')} 
            className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">👤</span>
            <span className="bottom-nav-label">{t('auth.profile')}</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default HomeLayout;
