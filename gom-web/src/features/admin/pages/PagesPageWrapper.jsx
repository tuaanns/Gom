import React from 'react';
import { PagesPage } from './PagesPage';
import { useNotify } from '../../../hooks/useNotify';

export const PagesPageWrapper = () => {
  const { notify } = useNotify();
  return <PagesPage notify={notify} />;
};
