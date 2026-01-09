import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { uploadProfileImage } from '../api/fateApi';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, updateProfile, changeUserPassword, deleteAccount, checkUser } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 프로필 정보
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 프로필 이미지
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (user) {
      // 사용자 정보 초기화
      setName(user.attributes?.name || '');
      // custom:nickname 우선, 없으면 nickname, 없으면 name
      setNickname(
        user.attributes?.['custom:nickname'] || 
        user.attributes?.nickname || 
        user.attributes?.name || 
        ''
      );
      setEmail(user.attributes?.email || user.username || '');
      
      // 프로필 이미지 URL 설정 (Cognito picture 속성 우선)
      if (user.attributes?.picture) {
        setImagePreview(user.attributes.picture);
      } else {
        // localStorage는 fallback으로만 사용
        const savedImageUrl = localStorage.getItem('profileImageUrl');
        if (savedImageUrl) {
          setImagePreview(savedImageUrl);
        }
      }
    }
  }, [user]);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return t('auth.passwordTooShort');
    if (!/[A-Z]/.test(pwd)) return t('auth.passwordNoUppercase');
    if (!/[a-z]/.test(pwd)) return t('auth.passwordNoLowercase');
    if (!/[0-9]/.test(pwd)) return t('auth.passwordNoNumber');
    return null;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.');
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const attributes = {};
      const currentName = user?.attributes?.name || '';
      const currentNickname = user?.attributes?.['custom:nickname'] || user?.attributes?.nickname || '';
      
      // name 업데이트
      if (name && name !== currentName) {
        attributes.name = name;
      }
      
      // nickname 업데이트
      if (nickname && nickname !== currentNickname) {
        attributes.nickname = nickname;
      }

      // 프로필 이미지 업로드
      if (profileImage) {
        try {
          const uploadResult = await uploadProfileImage(profileImage);
          if (uploadResult.success && uploadResult.imageUrl) {
            // 이미지 URL을 Cognito picture 속성에 저장
            attributes.picture = uploadResult.imageUrl;
            // localStorage에도 저장 (fallback)
            localStorage.setItem('profileImageUrl', uploadResult.imageUrl);
            setImagePreview(uploadResult.imageUrl);
            setProfileImage(null); // 업로드 완료 후 파일 상태 초기화
          }
        } catch (uploadError) {
          console.error('이미지 업로드 오류:', uploadError);
          setError(uploadError.message || '이미지 업로드에 실패했습니다.');
          setLoading(false);
          return;
        }
      }

      // 속성 업데이트 실행
      if (Object.keys(attributes).length > 0) {
        const result = await updateProfile(attributes);
        if (result.success) {
          setSuccess(t('auth.updateProfileSuccess'));
          await checkUser(); // 사용자 정보 새로고침
        } else {
          setError(result.error);
        }
      } else if (!profileImage) {
        setSuccess('변경사항이 없습니다.');
      }
    } catch (err) {
      setError(err.message || '정보 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setLoading(false);
      return;
    }

    const result = await changeUserPassword(currentPassword, newPassword);
    if (result.success) {
      setSuccess(t('auth.changePasswordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('auth.deleteAccountWarning'))) {
      return;
    }

    const confirmText = prompt(t('auth.deleteAccountConfirm') + '\n회원탈퇴를 확인하려면 "탈퇴"를 입력하세요.');
    if (confirmText !== '탈퇴') {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await deleteAccount();
    if (result.success) {
      window.location.href = '/';
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="profile-settings-page">
      <div className="profile-settings-container">
        <div className="profile-settings-header">
          <button onClick={() => navigate('/home')} className="back-btn">
            ← {t('common.back')}
          </button>
          <h1>{t('auth.profileSettings')}</h1>
        </div>

        <div className="profile-settings-tabs">
          <button
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            {t('auth.editProfile')}
          </button>
          <button
            className={activeTab === 'password' ? 'active' : ''}
            onClick={() => setActiveTab('password')}
          >
            {t('auth.changePassword')}
          </button>
          <button
            className={activeTab === 'delete' ? 'active' : ''}
            onClick={() => setActiveTab('delete')}
          >
            {t('auth.deleteAccount')}
          </button>
        </div>

        <div className="profile-settings-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="profile-image-section">
                <div className="profile-image-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" />
                  ) : (
                    <div className="profile-image-placeholder">
                      {name.charAt(0).toUpperCase() || email.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-image-actions">
                  <label htmlFor="profile-image" className="upload-btn">
                    {t('auth.uploadImage')}
                  </label>
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileImage(null);
                        setImagePreview(null);
                        localStorage.removeItem('profileImageUrl');
                      }}
                      className="remove-btn"
                    >
                      {t('auth.removeImage')}
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name">{t('auth.name')}</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="nickname">{t('auth.nickname')}</label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('auth.nicknamePlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('auth.email')}</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  readOnly
                  className="read-only"
                />
                <p className="form-hint">{t('auth.emailChangeHint')}</p>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? t('common.loading') : t('auth.updateProfile')}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-group">
                <label htmlFor="currentPassword">{t('auth.currentPassword')}</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">{t('auth.newPassword')}</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <small className="form-hint">{t('auth.passwordHint')}</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? t('common.loading') : t('auth.changePassword')}
              </button>
            </form>
          )}

          {activeTab === 'delete' && (
            <div className="delete-account-section">
              <h3>{t('auth.deleteAccountTitle')}</h3>
              <p>{t('auth.deleteAccountSubtitle')}</p>
              <p className="warning-text">{t('auth.deleteAccountWarning')}</p>
              <button
                onClick={handleDeleteAccount}
                className="delete-btn"
                disabled={loading}
              >
                {loading ? t('common.loading') : t('auth.deleteAccount')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
