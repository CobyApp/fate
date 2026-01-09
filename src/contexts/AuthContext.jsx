import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signIn, 
  signUp, 
  confirmSignUp, 
  resendSignUpCode, 
  signOut, 
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  updateUserAttribute,
  deleteUser,
  resetPassword,
  confirmResetPassword
} from 'aws-amplify/auth';

// aws-amplify v6에서 비밀번호 변경은 updatePassword를 사용하거나 Lambda를 통해 처리
// 현재는 Lambda를 통해 처리하도록 구현

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
      console.log('로그인 시도:', email);
      
      // v6에서는 signIn이 SRP 프로토콜을 사용
      const result = await signIn({ username: email, password });
      
      console.log('로그인 결과:', result);
      
      // SRP 인증이 완료될 때까지 대기
      if (result.isSignedIn) {
        await checkUser();
        return { success: true };
      }
      
      // 추가 인증 단계가 필요한 경우
      if (result.nextStep) {
        console.log('추가 인증 단계 필요:', result.nextStep);
        
        // UserNotConfirmedException은 Lambda Trigger가 처리했으므로 다시 시도
        if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
          // Lambda가 아직 처리 중일 수 있으므로 잠시 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const retryResult = await signIn({ username: email, password });
            if (retryResult.isSignedIn) {
              await checkUser();
              return { success: true };
            }
          } catch (retryErr) {
            console.error('재시도 로그인 오류:', retryErr);
          }
        }
      }
      
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
        // Lambda Trigger가 처리했어야 하는데 아직 처리되지 않은 경우
        // 잠시 대기 후 재시도
        console.log('계정 미확인 상태, Lambda 처리 대기 후 재시도');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const retryResult = await signIn({ username: email, password });
          if (retryResult.isSignedIn) {
            await checkUser();
            return { success: true };
          }
        } catch (retryErr) {
          console.error('재시도 로그인 오류:', retryErr);
          errorMessage = '이메일 인증이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.';
        }
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

  // 회원가입 (이메일 인증 없이 바로 사용 가능)
  const register = async (email, password, name, nickname) => {
    try {
      setError(null);
      const userAttributes = {
        email,
      };
      
      // name 속성 설정 (nickname이 없으면 name 사용, 둘 다 없으면 email 사용)
      if (name) {
        userAttributes.name = name;
      } else if (nickname) {
        userAttributes.name = nickname;
      } else {
        userAttributes.name = email;
      }
      
      // nickname 속성 설정 (custom:nickname 또는 nickname)
      if (nickname) {
        userAttributes['custom:nickname'] = nickname;
      } else if (name) {
        userAttributes['custom:nickname'] = name;
      }
      
      console.log('회원가입 시작:', { email, userAttributes });
      
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes,
          autoSignIn: {
            enabled: true
          }
        },
      });
      
      console.log('회원가입 결과:', result);
      
      // Lambda Pre Sign-up Trigger에서 자동으로 계정 활성화됨
      // autoSignIn이 활성화되어 있으면 자동으로 로그인 시도
      if (result.nextStep && result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // Lambda Trigger가 계정을 자동으로 활성화했으므로 바로 로그인 시도
        // 약간의 지연 후 로그인 시도 (Lambda가 처리할 시간 확보)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          console.log('자동 로그인 시도:', email);
          const loginResult = await signIn({ username: email, password });
          console.log('자동 로그인 결과:', loginResult);
          
          if (loginResult.isSignedIn) {
            await checkUser();
            return { success: true, email, autoSignedIn: true };
          }
        } catch (loginErr) {
          console.error('자동 로그인 오류:', loginErr);
          // UserNotConfirmedException이 발생하면 다시 시도
          if (loginErr.name === 'UserNotConfirmedException') {
            // Lambda가 아직 처리 중일 수 있으므로 다시 시도
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const retryResult = await signIn({ username: email, password });
              if (retryResult.isSignedIn) {
                await checkUser();
                return { success: true, email, autoSignedIn: true };
              }
            } catch (retryErr) {
              console.error('재시도 로그인 오류:', retryErr);
            }
          }
        }
      }
      
      // autoSignIn이 이미 완료된 경우
      if (result.isSignUpComplete) {
        await checkUser();
        return { success: true, email, autoSignedIn: true };
      }
      
      // 회원가입은 성공했지만 로그인에 실패한 경우, 사용자에게 로그인 페이지로 안내
      return { success: true, email, needsLogin: true };
    } catch (err) {
      console.error('회원가입 오류:', err);
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

  // 비밀번호 찾기 (이메일로 코드 전송)
  const forgotPassword = async (email) => {
    try {
      setError(null);
      await resetPassword({ username: email });
      return { success: true, email };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '비밀번호 재설정 요청에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 비밀번호 재설정 확인
  const confirmForgotPassword = async (email, confirmationCode, newPassword) => {
    try {
      setError(null);
      await confirmResetPassword({ username: email, confirmationCode, newPassword });
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '비밀번호 재설정에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 비밀번호 변경 (로그인 상태에서)
  // Lambda 함수를 통해 Cognito ChangePassword API 호출
  const changeUserPassword = async (oldPassword, newPassword) => {
    try {
      setError(null);
      
      // API를 통해 Lambda 함수 호출
      const { changePassword: changePasswordApi } = await import('../api/fateApi');
      const result = await changePasswordApi(oldPassword, newPassword);
      
      if (result.success) {
        return { success: true };
      } else {
        throw new Error(result.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      let errorMessage = '비밀번호 변경에 실패했습니다.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.toString) {
        errorMessage = err.toString();
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 사용자 정보 수정
  const updateProfile = async (attributes) => {
    try {
      setError(null);
      
      // name 속성 업데이트
      if (attributes.name !== undefined && attributes.name !== user?.attributes?.name) {
        await updateUserAttribute({ 
          userAttribute: { 
            attributeKey: 'name', 
            value: attributes.name 
          } 
        });
      }
      
      // custom:nickname 속성 업데이트
      if (attributes.nickname !== undefined) {
        const currentNickname = user?.attributes?.['custom:nickname'] || user?.attributes?.nickname;
        if (attributes.nickname !== currentNickname) {
          await updateUserAttribute({ 
            userAttribute: { 
              attributeKey: 'custom:nickname', 
              value: attributes.nickname 
            } 
          });
        }
      }
      
      // picture 속성 업데이트 (프로필 이미지)
      if (attributes.picture !== undefined && attributes.picture !== user?.attributes?.picture) {
        await updateUserAttribute({ 
          userAttribute: { 
            attributeKey: 'picture', 
            value: attributes.picture 
          } 
        });
      }

      await checkUser(); // 사용자 정보 새로고침
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '정보 수정에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 회원탈퇴
  const deleteAccount = async () => {
    try {
      setError(null);
      await deleteUser();
      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || err.toString() || '회원탈퇴에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
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
    forgotPassword,
    confirmForgotPassword,
    changeUserPassword,
    updateProfile,
    deleteAccount,
    checkUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
