import apiClient from '../../lib/apiClient';

export const profileApi = {
  update: (data) => apiClient.post('/profile/update', data),
  changePassword: (data) => apiClient.post('/profile/password', data),
  deleteAccount: () => apiClient.delete('/profile/delete'),
};

