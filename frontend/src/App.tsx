import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import CreateExpensePage from './pages/CreateExpensePage';
import ProtectedRoute from './components/layout/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/groups/:id" 
          element={
            <ProtectedRoute>
              <GroupDetailPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/groups/:groupId/expenses/new" 
          element={
            <ProtectedRoute>
              <CreateExpensePage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

