import axios from 'axios';
import apiClient from '../../lib/apiClient';
import { AI_BASE } from '../../lib/constants';

export const analysisApi = {
  predict: (formData) =>
    apiClient.post('/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000, // 10 minutes for slow cloud backend
    }),
  predictLens: (formData) => 
    apiClient.post('/predict/lens', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000, 
    }),
  retranslateLens: (lensResults, lang) =>
    axios.post(`${AI_BASE}/predict/lens/retranslate`, {
      lens_results: lensResults,
      lang: lang,
    }, { timeout: 60000 }),
  chat: (question, lang) => apiClient.post('/ai/chat', { question, lang }, {
    timeout: 300000, // 5 minutes - AI server may cold start on Azure Free tier
  }),
  getStats: () => apiClient.get('/stats'),
};
