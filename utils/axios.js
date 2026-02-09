import axios from 'axios';

// ----------------------------------------------------------------------

// TMDB requires the Bearer token for the "Read Access Token"
// or an api_key in the params. Using Headers is cleaner.
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3'
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = process.env.NEXT_PUBLIC_TMDB_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong!')
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  tmdb: {
    movie: (category) => `/movie/${category}`,
    tv: (category) => `/tv/${category}`,
    details: (type, id) => `/${type}/${id}`,
    trending: (type, time) => `/trending/${type}/${time}`,
    search: '/search/multi',
    credits: (type, id) => `/${type}/${id}/credits`,
    recommendations: (type, id) => `/${type}/${id}/recommendations`,
  },
};
