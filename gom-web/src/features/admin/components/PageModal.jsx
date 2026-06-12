import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api';
import { getErrorMessage } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const PageModal = ({ pageData, onClose, onSuccess, notify }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    if (pageData) {
      setFormData({
        title: pageData.title || '',
        content: pageData.content || '',
      });
    }
  }, [pageData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminApi.updatePage(pageData.id, formData);
      notify?.(t('admin.pagesPage.saveSuccess'), 'success');
      onSuccess();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!pageData} onClose={onClose} size="xl" showCloseButton={false}>
      <div className="flex h-full flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Edit Page: {pageData?.slug}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <form id="page-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Page Title
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Privacy Policy"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-[400px]">
              <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                <span>Content (HTML Supported)</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                className="w-full flex-1 rounded-lg border border-gray-300 p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="<p>Write your HTML content here... LƯU Ý: Nếu để trống, hệ thống sẽ tự động dùng giao diện mặc định. Nếu bạn nhập nội dung vào đây, nó sẽ GHI ĐÈ lên toàn bộ giao diện mặc định của trang này.</p>"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700 mt-auto">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="page-form" loading={loading}>
            <Save size={16} className="mr-2" />
            Save Content
          </Button>
        </div>
      </div>
    </Modal>
  );
};
