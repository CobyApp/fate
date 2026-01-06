// API 설정
// 배포 후 실제 API Gateway URL로 변경하세요
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-api-id.execute-api.region.amazonaws.com/dev';

export default {
  baseURL: API_BASE_URL,
  endpoints: {
    calculateFate: '/fate',
    getFateHistory: '/fate',
    getFateById: (id) => `/fate/${id}`
  }
};
