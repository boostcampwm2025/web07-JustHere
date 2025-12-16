import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 (필요시)
apiClient.interceptors.request.use(
  (config) => {
    // 요청 전 처리
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (필요시)
apiClient.interceptors.response.use(
  (response) => {
    // 응답 후 처리
    return response;
  },
  (error) => {
    // 에러 처리
    return Promise.reject(error);
  }
);
