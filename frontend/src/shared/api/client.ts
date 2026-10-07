import axios from 'axios'

// Base URL of the backend API. Vite dev server proxies requests to localhost:8000.
// withCredentials is required so that httpOnly cookies (access_token, refresh_token)
// are sent with every request.
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})
