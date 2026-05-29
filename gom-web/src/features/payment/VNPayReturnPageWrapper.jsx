import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { VNPayReturnPage } from './VNPayReturnPage';

export const VNPayReturnPageWrapper = () => {
  const { fetchUser } = useAuth();
  const { notify } = useNotify();

  return <VNPayReturnPage fetchUser={fetchUser} notify={notify} />;
};

export default VNPayReturnPageWrapper;
