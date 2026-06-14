import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { ProfilePage } from './ProfilePage';

export const ProfilePageWrapper = () => {
  const { user, quota, fetchUser, logout } = useAuth();
  const { notify } = useNotify();

  return <ProfilePage user={user} quota={quota} fetchUser={fetchUser} notify={notify} logout={logout} />;
};

