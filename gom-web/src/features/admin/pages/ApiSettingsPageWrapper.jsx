import React from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { ApiSettingsPage } from './ApiSettingsPage';

export const ApiSettingsPageWrapper = () => {
  const { notify } = useNotify();
  return <ApiSettingsPage notify={notify} />;
};

export default ApiSettingsPageWrapper;
