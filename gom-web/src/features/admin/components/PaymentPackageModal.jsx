import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { adminApi } from '../api';
import { getErrorMessage } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

export const PaymentPackageModal = ({ packageData, onClose, onSuccess, notify }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    price: '',
    credits: '',
    featured: false,
    discount: '',
    discount_en: '',
  });

  const isEditing = !!packageData;

  useEffect(() => {
    if (packageData) {
      setFormData({
        name: packageData.name || '',
        name_en: packageData.name_en || '',
        price: packageData.price || '',
        credits: packageData.credits || '',
        featured: packageData.featured || false,
        discount: packageData.discount || '',
        discount_en: packageData.discount_en || '',
      });
    }
  }, [packageData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        name: formData.name,
        name_en: formData.name_en || null,
        price: parseFloat(formData.price),
        credits: parseInt(formData.credits),
        featured: formData.featured,
        discount: formData.discount || null,
        discount_en: formData.discount_en || null,
      };

      if (isEditing) {
        await adminApi.updatePaymentPackage(packageData.id, dataToSubmit);
        notify?.(t('admin.paymentPackagesPage.modal.editSuccess'), 'success');
      } else {
        await adminApi.createPaymentPackage(dataToSubmit);
        notify?.(t('admin.paymentPackagesPage.modal.addSuccess'), 'success');
      }
      onSuccess();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEditing ? t('admin.paymentPackagesPage.modal.editTitle') : t('admin.paymentPackagesPage.modal.addTitle')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 overflow-y-auto">
          <form id="package-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.paymentPackagesPage.modal.nameVi')}
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Cơ Bản"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.paymentPackagesPage.modal.nameEn')}
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Basic"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('admin.paymentPackagesPage.modal.price')}
                </label>
                <input
                  type="number"
                  name="price"
                  required
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="150000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('admin.paymentPackagesPage.modal.credits')}
                </label>
                <input
                  type="number"
                  name="credits"
                  required
                  min="1"
                  value={formData.credits}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.paymentPackagesPage.modal.discountVi')}
              </label>
              <input
                type="text"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Tiết kiệm 20%"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.paymentPackagesPage.modal.discountEn')}
              </label>
              <input
                type="text"
                name="discount_en"
                value={formData.discount_en}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Save 20%"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="featured"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.paymentPackagesPage.modal.featured')}
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('admin.paymentPackagesPage.modal.cancel')}
          </button>
          <button
            type="submit"
            form="package-form"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? t('admin.paymentPackagesPage.modal.saving') : t('admin.paymentPackagesPage.modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
