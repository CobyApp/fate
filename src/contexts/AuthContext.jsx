import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signIn, 
  signUp, 
  confirmSignUp, 
  resendSignUpCode, 
  signOut, 
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes
} from 'aws-amplify/auth';

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
      const currentUser = await getCurrentUser();
      // v6에서는 속성을 별도로 가져와야 함
      try {
        const attributes = await fetchUserAttributes();
        setUser({
          ...currentUser,
          attributes
        });
      } catch {
        setUser(currentUser);
      }
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
      // v6에서는 signIn이 SRP 프로토콜을 사용
      const result = await signIn({ username: email, password });
      
      // SRP 인증이 완료될 때까지 대기
      if (result.isSignedIn) {
        await checkUser();
        return { success: true };
      }
      
      // 추가 인증 단계가 필요한 경우 (예: 새 비밀번호 설정)
      return { success: false, error: '추가 인증이 필요합니다.' };
    } catch (err) {
      // 더 자세한 에러 정보 로깅
      console.error('로그인 오류:', err);
      console.error('에러 상세:', {
        name: err.name,
        message: err.message,
        code: err.code,
        underlyingError: err.underlyingError,
      });
      
      let errorMessage = '로그인에 실패했습니다.';
      
      // Cognito 에러 코드에 따른 메시지
      if (err.name === 'NotAuthorizedException') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (err.name === 'UserNotConfirmedException') {
        errorMessage = '이메일 인증이 완료되지 않았습니다. 이메일을 확인하세요.';
      } else if (err.name === 'UserNotFoundException') {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.toString) {
        errorMessage = err.toString();
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 회원가입
  const register = async (email, password, name) => {
    try {
      setError(null);
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: name || email,
          },
        },
      });
      return { success: true, email };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '회원가입에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 이메일 인증 확인
  const confirmRegistration = async (email, confirmationCode) => {
    try {
      setError(null);
      await confirmSignUp({ username: email, confirmationCode });
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '인증 코드가 올바르지 않습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 인증 코드 재전송
  const resendCode = async (email) => {
    try {
      setError(null);
      await resendSignUpCode({ username: email });
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '인증 코드 재전송에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      setError(null);
      await signOut();
      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '로그아웃에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 인증 토큰 가져오기
  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
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
