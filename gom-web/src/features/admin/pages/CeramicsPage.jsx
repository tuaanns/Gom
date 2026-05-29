import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { CeramicModal } from '../components/CeramicModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ImageWithFallback } from '../../../components/ui/ImageWithFallback';
import { adminApi } from '../api';
import { getErrorMessage } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { useTranslation } from 'react-i18next';

export const CeramicsPage = ({ notify }) => {
  const { t } = useTranslation();
  const [ceramics, setCeramics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCeramic, setSelectedCeramic] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [ceramicToDelete, setCeramicToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCeramics();
  }, []);

  const fetchCeramics = async () => {
    try {
      setLoading(true);
      const res = await adminApi.ceramics();
      const data = res.data?.data || res.data;
      setCeramics(Array.isArray(data) ? data : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (ceramic) => {
    setCeramicToDelete(ceramic);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ceramicToDelete) return;
    setDeleting(true);
    try {
      await adminApi.deleteCeramic(ceramicToDelete.id);
      notify?.(t('admin.ceramicsPage.deletedSuccess'), 'success');
      setShowDeleteDialog(false);
      setCeramicToDelete(null);
      fetchCeramics();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (ceramic) => {
    try {
      await adminApi.updateCeramic(ceramic.id, { is_featured: !ceramic.is_featured });
      notify?.(
        ceramic.is_featured ? t('admin.ceramicsPage.removedFeatured') : t('admin.ceramicsPage.markedFeatured'),
        'success'
      );
      fetchCeramics();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    }
  };

  const handleEdit = (ceramic) => {
    setSelectedCeramic(ceramic);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedCeramic(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCeramic(null);
  };

  const handleSuccess = () => {
    fetchCeramics();
  };

  const columns = [
    {
      key: 'id',
      header: t('admin.ceramicsPage.table.id'),
      accessor: (row) => row.id,
      cell: (row) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
          #{row.id}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'image',
      header: t('admin.ceramicsPage.table.image'),
      accessor: () => '',
      cell: (row) => (
        <ImageWithFallback
          src={row.image_url}
          alt={row.name}
          className="h-12 w-12 rounded-lg"
        />
      ),
      sortable: false,
      searchable: false,
    },
    {
      key: 'name',
      header: t('admin.ceramicsPage.table.name'),
      accessor: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.country}</p>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'country',
      header: t('admin.ceramicsPage.table.country'),
      accessor: (row) => row.country,
      sortable: true,
      searchable: true,
    },
    {
      key: 'era',
      header: t('admin.ceramicsPage.table.era'),
      accessor: (row) => row.era || '—',
      sortable: true,
      searchable: true,
    },
    {
      key: 'is_featured',
      header: t('admin.ceramicsPage.table.featured'),
      accessor: (row) => row.is_featured,
      cell: (row) => (
        <button
          type="button"
          onClick={() => handleToggleFeatured(row)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
          title={row.is_featured ? t('admin.ceramicsPage.table.clickToUnfeature') : t('admin.ceramicsPage.table.clickToFeature')}
        >
          {row.is_featured ? (
            <Badge variant="gold">
              <Star size={12} className="mr-1" />
              Featured
            </Badge>
          ) : (
            <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">—</span>
          )}
        </button>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'actions',
      header: t('admin.ceramicsPage.table.actions'),
      accessor: () => '',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      sortable: false,
      searchable: false,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.ceramicsPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.ceramicsPage.subtitle')}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          {t('admin.ceramicsPage.addCeramic')}
        </button>
      </div>

      <DataTable
        data={ceramics}
        columns={columns}
        searchPlaceholder={t('admin.ceramicsPage.searchPlaceholder')}
        pageSize={10}
      />

      <CeramicModal
        isOpen={showModal}
        onClose={handleCloseModal}
        ceramic={selectedCeramic}
        onSuccess={handleSuccess}
        notify={notify}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title={t('admin.ceramicsPage.deleteTitle')}
        message={t('admin.ceramicsPage.deleteMessage', { name: ceramicToDelete?.name })}
        confirmText={t('admin.ceramicsPage.deleteConfirm')}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default CeramicsPage;
