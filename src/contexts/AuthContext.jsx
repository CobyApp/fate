import { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 현재 사용자 확인
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const login = async (email, password) => {
    try {
      setError(null);
      await Auth.signIn(email, password);
      await checkUser();
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || '로그인에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 회원가입
  const register = async (email, password, name) => {
    try {
      setError(null);
      await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name: name || email,
        },
      });
      return { success: true, email };
    } catch (err) {
      const errorMessage = err.message || '회원가입에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 이메일 인증 확인
  const confirmRegistration = async (email, confirmationCode) => {
    try {
      setError(null);
      await Auth.confirmSignUp(email, confirmationCode);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || '인증 코드가 올바르지 않습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 인증 코드 재전송
  const resendCode = async (email) => {
    try {
      setError(null);
      await Auth.resendSignUp(email);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || '인증 코드 재전송에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      setError(null);
      await Auth.signOut();
      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || '로그아웃에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 인증 토큰 가져오기
  const getAuthToken = async () => {
    try {
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken() || null;
    } catch (err) {
      return null;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    confirmRegistration,
    resendCode,
    logout,
    getAuthToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
