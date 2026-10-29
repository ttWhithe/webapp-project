import { createBrowserRouter } from 'react-router-dom'

import AdminRoute from './AdminRoute'
import Layout from './Layout'
import ProtectedRoute from './ProtectedRoute'

import AdminCatalogPage from '@/pages/AdminCatalogPage'
import AuthPage from '@/pages/AuthPage'
import CharacterDetailPage from '@/pages/CharacterDetailPage'
import CharactersPage from '@/pages/CharactersPage'
import Dashboard from '@/pages/Dashboard'
import ErrorPage from '@/pages/ErrorPage'
import ProfilePage from '@/pages/ProfilePage'
import LandingPage from '@/pages/LandingPage'

export const router = createBrowserRouter([
  {
    path: '/welcome',
    element: <LandingPage />,
  },
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
    errorElement: <ErrorPage />,
    children: [
      // --- ПУБЛИЧНЫЕ СТРАНИЦЫ (Доступны всем) ---
      {
        path: 'characters',
        element: <CharactersPage />,
      },
      {
        path: 'characters/:slug',
        element: <CharacterDetailPage />,
      },

      // --- ЗАЩИЩЕННЫЕ СТРАНИЦЫ (Только для авторизованных) ---
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: 'admin/catalog',
                element: <AdminCatalogPage />,
              },
            ],
          },
        ],
      },
    ],
  },
])
