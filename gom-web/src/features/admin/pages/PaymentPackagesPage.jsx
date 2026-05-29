import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { adminApi } from '../api';
import { formatVND, getErrorMessage } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PaymentPackageModal } from '../components/PaymentPackageModal';
import { useTranslation } from 'react-i18next';

export const PaymentPackagesPage = ({ notify }) => {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'vi').startsWith('en');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  
  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await adminApi.paymentPackages();
      const data = res.data?.data || res.data;
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPackage(null);
    setIsModalOpen(true);
  };

  const confirmDelete = (pkg) => {
    setPackageToDelete(pkg);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!packageToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deletePaymentPackage(packageToDelete.id);
      notify?.(t('admin.paymentPackagesPage.deletedSuccess'), 'success');
      setDeleteModalOpen(false);
      setPackageToDelete(null);
      fetchPackages();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'id',
      header: t('admin.paymentPackagesPage.table.id'),
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
      key: 'name',
      header: t('admin.paymentPackagesPage.table.name'),
      accessor: (row) => row.name_en && isEn ? row.name_en : row.name,
      cell: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.name_en && isEn ? row.name_en : row.name}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'price',
      header: t('admin.paymentPackagesPage.table.price'),
      accessor: (row) => row.price,
      cell: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {formatVND(row.price)}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'credits',
      header: t('admin.paymentPackagesPage.table.credits'),
      accessor: (row) => row.credits,
      cell: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.credits}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'featured',
      header: t('admin.paymentPackagesPage.table.featured'),
      accessor: (row) => row.featured,
      cell: (row) => (
        <Badge variant={row.featured ? 'success' : 'default'}>
          {row.featured ? t('admin.paymentPackagesPage.table.yes') : t('admin.paymentPackagesPage.table.no')}
        </Badge>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'discount',
      header: t('admin.paymentPackagesPage.table.discountLabel'),
      accessor: (row) => row.discount_en && isEn ? row.discount_en : row.discount,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.discount_en && isEn ? row.discount_en : (row.discount || '-')}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'actions',
      header: t('admin.paymentPackagesPage.table.actions'),
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
            title={t('admin.paymentPackagesPage.table.edit')}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => confirmDelete(row)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
            title={t('admin.paymentPackagesPage.table.delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.paymentPackagesPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.paymentPackagesPage.subtitle')}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          {t('admin.paymentPackagesPage.addPackage')}
        </button>
      </div>

      <DataTable
        data={packages}
        columns={columns}
        searchPlaceholder={t('admin.paymentPackagesPage.searchPlaceholder')}
        pageSize={10}
      />

      {isModalOpen && (
        <PaymentPackageModal
          packageData={selectedPackage}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchPackages();
          }}
          notify={notify}
        />
      )}

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t('admin.paymentPackagesPage.deleteTitle')}
        message={t('admin.paymentPackagesPage.deleteConfirm', { name: packageToDelete?.name })}
        confirmText={t('admin.paymentPackagesPage.deletePackageBtn')}
        cancelText={t('admin.paymentPackagesPage.cancel')}
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};
