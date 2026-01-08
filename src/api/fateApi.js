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
      const token = session.tokens?.idToken?.toString();
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

export const calculateFate = async (birthDate, birthTime, gender) => {
  try {
    const response = await api.post(config.endpoints.calculateFate, {
      birthDate,
      birthTime,
      gender
    });
    return response.data;
  } catch (error) {
    console.error('사주 계산 오류:', error);
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
