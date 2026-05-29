import React from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { PaymentSettingsPage } from './PaymentSettingsPage';

export const PaymentSettingsPageWrapper = () => {
  const { notify } = useNotify();
  return <PaymentSettingsPage notify={notify} />;
};

export default PaymentSettingsPageWrapper;
