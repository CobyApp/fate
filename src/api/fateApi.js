import axios from 'axios';
import config from './config';
import { fetchAuthSession } from 'aws-amplify/auth';

const api = axios.create({
  baseURL: config.baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터: 인증 토큰 추가
api.interceptors.request.use(
  async (requestConfig) => {
    try {
      const session = await fetchAuthSession();
      // 비밀번호 변경과 이미지 업로드는 AccessToken 필요, 나머지는 ID Token 사용
      const needsAccessToken = requestConfig.url?.includes('/change-password') || 
                               requestConfig.url?.includes('/upload-profile-image');
      const token = needsAccessToken 
        ? session.tokens?.accessToken?.toString()
        : session.tokens?.idToken?.toString();
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // 인증 토큰을 가져올 수 없어도 요청은 계속 진행
      console.warn('인증 토큰을 가져올 수 없습니다:', error);
    }
    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const calculateFate = async (
  birthDate, 
  birthTime, 
  gender, 
  language = 'ko',
  category = 'saju',
  partnerBirthDate = '',
  partnerBirthTime = '',
  partnerGender = '',
  zodiacYear = ''
) => {
  try {
    const response = await api.post(config.endpoints.calculateFate, {
      birthDate,
      birthTime,
      gender,
      language,
      category,
      partnerBirthDate,
      partnerBirthTime,
      partnerGender,
      zodiacYear
    });
    return response.data;
  } catch (error) {
    console.error('운세 계산 오류:', error);
    throw error;
  }
};

export const getFateHistory = async () => {
  try {
    const response = await api.get(config.endpoints.getFateHistory);
    return response.data;
  } catch (error) {
    console.error('기록 조회 오류:', error);
    throw error;
  }
};

export const getFateById = async (id) => {
  try {
    const response = await api.get(config.endpoints.getFateById(id));
    return response.data;
  } catch (error) {
    console.error('기록 조회 오류:', error);
    throw error;
  }
};

export const changePassword = async (oldPassword, newPassword) => {
  try {
    const response = await api.post(config.endpoints.changePassword, {
      oldPassword,
      newPassword
    });
    return response.data;
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

export const getUploadProfileImageUrl = async (fileExtension = 'jpg') => {
  try {
    const response = await api.get(config.endpoints.uploadProfileImage(fileExtension));
    return response.data;
  } catch (error) {
    console.error('이미지 업로드 URL 생성 오류:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

export const uploadProfileImage = async (file) => {
  try {
    // 파일 확장자 추출
    const extension = file.name.split('.').pop().toLowerCase() || 'jpg';
    
    // 1. Presigned URL 가져오기
    const { uploadUrl, imageUrl } = await getUploadProfileImageUrl(extension);
    
    // 2. S3에 직접 업로드
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error('이미지 업로드에 실패했습니다.');
    }

    return {
      success: true,
      imageUrl
    };
  } catch (error) {
    console.error('프로필 이미지 업로드 오류:', error);
    throw error;
  }
};
