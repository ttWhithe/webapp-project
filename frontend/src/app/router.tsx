import { createBrowserRouter } from 'react-router-dom'

import AdminRoute from './AdminRoute'
import Layout from './Layout'
import ProtectedRoute from './ProtectedRoute'

import AdminCatalogPage from '@/pages/AdminCatalogPage'
import AuthPage from '@/pages/AuthPage'
import CharacterDetailPage from '@/pages/CharacterDetailPage'
import CharactersPage from '@/pages/CharactersPage'
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
          {
            path: 'characters',
            element: <CharactersPage />,
          },
          {
            path: 'characters/:slug',
            element: <CharacterDetailPage />,
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
