import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { AnalysisPage } from './AnalysisPage';

// Wrapper to inject router and hooks into AnalysisPage
export const AnalysisPageWrapper = () => {
  const { token, user, quota, setQuota } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  // Convert navigate to setView for backward compatibility
  const setView = (view, search) => {
    const viewMap = {
      'payment': '/payment',
      'lines': '/ceramics',
      'history': '/history',
      'profile': '/profile',
      'transaction_history': '/transactions',
      'contact': '/contact',
      'about': '/about',
      'terms': '/terms',
      'privacy': '/privacy',
      'admin_dashboard': '/admin',
      'auth': '/auth',
    };
    let path = viewMap[view] || '/';
    if (search) {
      path += search;
    }
    navigate(path);
  };

  return (
    <AnalysisPage
      token={token}
      user={user}
      quota={quota}
      setQuota={setQuota}
      notify={notify}
      setView={setView}
    />
  );
};

