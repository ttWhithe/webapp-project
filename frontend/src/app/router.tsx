import { createBrowserRouter } from 'react-router-dom'

import Layout from './Layout'
import ProtectedRoute from './ProtectedRoute'

import AuthPage from '@/pages/AuthPage'
import Dashboard from '@/pages/Dashboard'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthPage initialTab="login" />,
  },
  {
    path: '/register',
    element: <AuthPage initialTab="register" />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
        ],
      },
    ],
  },
])
