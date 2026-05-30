import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { PredictionDetailView } from '../../components/ui/PredictionDetailView';
import { LoadingState } from '../../components/ui/states';
import { historyApi } from './api';

export const HistoryDetailModal = ({ item, onClose }) => {
  const { t } = useTranslation();
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item?.id) {
      setDetailData(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const response = await historyApi.detail(item.id);
        setDetailData(response.data?.data || response.data);
      } catch (error) {
        console.error('Failed to fetch prediction detail:', error);
        // Fallback to item data if API fails
        setDetailData(item);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [item?.id]);

  if (!item) return null;

  return (
    <Modal open={!!item} onClose={onClose} size="xl" title={t('history.detail.title')}>
      {loading ? (
        <LoadingState message={t('common.loading')} />
      ) : (
        <PredictionDetailView prediction={detailData || item} showUserInfo={false} showDebugInfo={true} />
      )}
    </Modal>
  );
};

export default HistoryDetailModal;

