import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import Layout from '@/components/layout/Layout.tsx';
import HomeLayout from '@/components/layout/HomeLayout.tsx';
import PageTransition from '@/components/PageTransition.tsx';
import PedidosPage from '@/features/booking/pages/PedidosPage';
import MeusAlugueisPage from '@/features/booking/pages/MeusAlugueisPage';
import ApexPayPage from '@/features/bank/pages/ApexPayPage';
import AdminDashboardPage from '@/features/admin/pages/AdminDashboardPage';
import AdminUsersPage from '@/features/admin/pages/AdminUsersPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ToastContainer from '@/components/ui/ToastContainer';

import AuthPage from '@/features/auth/pages/AuthPage';
import CarsPage from '@/features/cars/pages/CarsPage.tsx';
import CarDetailPage from '@/features/cars/pages/CarDetailPage.tsx';
import PistasPage from '@/features/circuits/pages/PistasPage';
import ErrorPage from '@/features/errors/pages/ErrorPage';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'apex',
  '/login': 'apex · Entrar',
  '/cadastro': 'apex · Criar conta',
  '/auth': 'apex · Acesso',
  '/pistas': 'apex · Pistas',
  '/cars': 'apex · Frota',
  '/meus-alugueis': 'apex · Minhas sessões',
  '/apexpay': 'apex · ApexPay',
  '/admin': 'apex · Painel',
  '/admin/usuarios': 'apex · Pilotos',
  '/pedidos': 'apex · Sessões',
  '/erro': 'apex · Erro',
};

function RouteTitleUpdater() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (ROUTE_TITLES[pathname]) {
      document.title = ROUTE_TITLES[pathname];
    } else if (pathname.startsWith('/cars/')) {
      document.title = 'apex · Veículo';
    } else {
      document.title = 'apex · Não encontrado';
    }
  }, [pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    void useCurrencyStore.getState().initRate();
  }, []);

  return (
    <Router>
      <RouteTitleUpdater />
      <ToastContainer />
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<PageTransition><HomeLayout /></PageTransition>} />
        <Route path="/login" element={<PageTransition><AuthPage initialMode="login" /></PageTransition>} />
        <Route path="/cadastro" element={<PageTransition><AuthPage initialMode="register" /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />

        <Route element={<Layout />}>
          {/* Rota pública de pistas oficiais */}
          <Route path="/pistas" element={<PageTransition><PistasPage /></PageTransition>} />

          {/* Rota pública de catálogo */}
          <Route path="/cars" element={<PageTransition><CarsPage /></PageTransition>} />
          <Route path="/cars/:id" element={<PageTransition><CarDetailPage /></PageTransition>} />

          {/* Frota fixa imutável (redireciona ao showroom oficial) */}
          <Route path="/frota" element={<Navigate to="/cars" replace />} />

          {/* Gestão de Pilotos & Usuários */}
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <PageTransition><AdminUsersPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Gestão de Pedidos & Homologação Race Control */}
          <Route
            path="/pedidos"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <PageTransition><PedidosPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Área exclusiva do Cliente */}
          <Route
            path="/meus-alugueis"
            element={
              <ProtectedRoute allowedRoles={['CLIENTE']}>
                <PageTransition><MeusAlugueisPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Rota legada redirecionada ao painel administrativo único */}
          <Route path="/analises" element={<Navigate to="/admin" replace />} />

          {/* Carteira ApexPay do Piloto */}
          <Route
            path="/apexpay"
            element={
              <ProtectedRoute allowedRoles={['CLIENTE']}>
                <PageTransition><ApexPayPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Painel Executivo Administrativo */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <PageTransition><AdminDashboardPage /></PageTransition>
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/erro" element={<PageTransition><ErrorPage /></PageTransition>} />
        <Route path="/*" element={<PageTransition><ErrorPage code="404" /></PageTransition>} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
