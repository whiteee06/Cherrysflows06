/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingState } from './components/common/StateViewer';

// Public pages - code split for performance
const LandingPage = lazy(() => import('./pages/public/LandingPage').then((m) => ({ default: m.LandingPage })));
const SignInPage = lazy(() => import('./pages/public/SignInPage').then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('./pages/public/SignUpPage').then((m) => ({ default: m.SignUpPage })));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const UpdatePasswordPage = lazy(() => import('./pages/public/UpdatePasswordPage').then((m) => ({ default: m.UpdatePasswordPage })));
const DeveloperPage = lazy(() => import('./pages/public/DeveloperPage').then((m) => ({ default: m.DeveloperPage })));

// App workspace pages - code split for fast bundle delivery
const DashboardPage = lazy(() => import('./pages/app/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CustomersPage = lazy(() => import('./pages/app/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const ProductsPage = lazy(() => import('./pages/app/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const InventoryPage = lazy(() => import('./pages/app/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const SalesPage = lazy(() => import('./pages/app/SalesPage').then((m) => ({ default: m.SalesPage })));
const InvoicesPage = lazy(() => import('./pages/app/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const ExpensesPage = lazy(() => import('./pages/app/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('./pages/app/ProfilePage').then((m) => ({ default: m.ProfilePage })));

const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh] p-8">
    <LoadingState message="Loading module..." />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Marketing & Auth Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
              <Route path="/developer" element={<DeveloperPage />} />
            </Route>

            {/* Business Management SaaS Workspace Routes (Guarded by Supabase Auth) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
