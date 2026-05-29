import React, { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, Upload, Link as LinkIcon, Image as ImageIcon, Copy, Check, Globe } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { adminApi } from '../api';
import { storageApi } from '../../../lib/storageApi';
import { getErrorMessage } from '../../../lib/utils';
import { PageSectionsModal } from '../components/PageSectionsModal';
import { Modal } from '../../../components/ui/Modal';
import { useTranslation } from 'react-i18next';

export const PagesPage = ({ notify }) => {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'vi').startsWith('en');
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: '', title_en: '', slug: '', content: '', seo_title: '', seo_description: '', seo_keywords: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const insertAtCursor = (text, textareaId) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      setNewPageData(prev => ({ ...prev, content: prev.content + text }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    setNewPageData(prev => ({ ...prev, content: newValue }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 10);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify?.(t('admin.pagesPage.selectImageError'), 'error');
      return;
    }

    setUploadingImage(true);
    try {
      notify?.(t('admin.pagesPage.uploadingImage'), 'info');
      const res = await storageApi.uploadSingle(file, 'pages');
      setUploadedImageUrl(res.fileUrl);
      notify?.(t('admin.pagesPage.uploadImageSuccess'), 'success');
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await adminApi.pages();
      const data = res.data?.data || res.data;
      setPages(Array.isArray(data) ? data : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page) => {
    setSelectedPage(page);
    setIsModalOpen(true);
  };

  const handleDelete = async (page) => {
    if (!window.confirm(t('admin.pagesPage.deleteConfirm', { title: page.title }))) return;
    
    try {
      await adminApi.deletePage(page.id);
      notify?.(t('admin.pagesPage.deletedSuccess'), 'success');
      fetchPages();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newPageData.title || !newPageData.slug) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.createPage(newPageData);
      notify?.(t('admin.pagesPage.addSuccess'), 'success');
      setIsAddModalOpen(false);
      setNewPageData({ title: '', title_en: '', slug: '', content: '', seo_title: '', seo_description: '', seo_keywords: '' });
      fetchPages();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOverrideCount = (row) => {
    if (!row.content) return 0;
    try {
      const parsed = JSON.parse(row.content);
      return Object.keys(parsed).length;
    } catch {
      return 0;
    }
  };

  const columns = [
    {
      key: 'id',
      header: t('admin.pagesPage.table.id'),
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
      key: 'title',
      header: t('admin.pagesPage.table.title'),
      accessor: (row) => row.title_en && isEn ? row.title_en : row.title,
      cell: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.title_en && isEn ? row.title_en : row.title}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'slug',
      header: t('admin.pagesPage.table.slug'),
      accessor: (row) => row.slug,
      cell: (row) => (
        <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
          /{row.slug}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'overrides',
      header: t('admin.pagesPage.table.overrides'),
      accessor: (row) => getOverrideCount(row),
      cell: (row) => {
        const count = getOverrideCount(row);
        return count > 0 ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {count} {t('admin.pagesPage.table.sections')}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('admin.pagesPage.table.default')}</span>
        );
      },
      sortable: true,
      searchable: false,
    },
    {
      key: 'updated_at',
      header: t('admin.pagesPage.table.updatedAt'),
      accessor: (row) => row.updated_at,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.updated_at).toLocaleString()}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'actions',
      header: t('admin.pagesPage.table.actions'),
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
            title={t('admin.pagesPage.table.editContent')}
          >
            <Edit size={14} />
            {t('admin.pagesPage.table.edit')}
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            title={t('admin.pagesPage.table.deletePage')}
          >
            <Trash2 size={14} />
            {t('admin.pagesPage.table.delete')}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.pagesPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.pagesPage.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          {t('admin.pagesPage.addPage')}
        </button>
      </div>

      <DataTable
        data={pages}
        columns={columns}
        searchPlaceholder={t('admin.pagesPage.searchPlaceholder')}
        pageSize={10}
      />

      {isModalOpen && (
        <PageSectionsModal
          pageData={selectedPage}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchPages();
          }}
          notify={notify}
        />
      )}

      {isAddModalOpen && (
        <Modal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          size="full"
          showCloseButton={false}
        >
          <div className="flex h-full flex-col max-h-[85vh] p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.pagesPage.addNewPageTitle')}</h2>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {t('admin.pagesPage.customPageDesc')}
              </span>
            </div>
            
            <form id="add-page-form" onSubmit={handleAddSubmit} className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 mt-4 overflow-y-auto pr-1">
              {/* Left Column: Editor & Controls */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.pagesPage.pageNameVi', { defaultValue: 'Tên trang (Tiếng Việt) *' })}</label>
                    <input
                      type="text"
                      required
                      value={newPageData.title}
                      onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                      placeholder={t('admin.pagesPage.pageNamePlaceholder')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.pagesPage.pageNameEn', { defaultValue: 'Tên trang (Tiếng Anh)' })}</label>
                    <input
                      type="text"
                      value={newPageData.title_en || ''}
                      onChange={(e) => setNewPageData({ ...newPageData, title_en: e.target.value })}
                      placeholder="e.g., About Us"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.pagesPage.slug')}</label>
                    <input
                      type="text"
                      required
                      value={newPageData.slug}
                      onChange={(e) => setNewPageData({ ...newPageData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                      placeholder={t('admin.pagesPage.slugPlaceholder')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[250px]">
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.pagesPage.editorTitle')}</label>
                  <textarea
                    id="new-page-content"
                    value={newPageData.content}
                    onChange={(e) => setNewPageData({ ...newPageData, content: e.target.value })}
                    placeholder={t('admin.pagesPage.pageContentPlaceholder')}
                    className="w-full flex-1 min-h-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                  />
                </div>

                {/* Image Upload Assistant */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <ImageIcon size={14} /> {t('admin.pagesPage.imageAssistant')}
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 transition-colors">
                      <Upload size={14} />
                      <span>{uploadingImage ? t('admin.pagesPage.uploading') : t('admin.pagesPage.uploadImage')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {uploadedImageUrl && (
                      <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-700">
                        <img src={uploadedImageUrl} alt="Uploaded" className="h-10 w-10 rounded object-cover" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="truncate text-[10px] font-mono text-gray-500 dark:text-gray-400">{uploadedImageUrl}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(uploadedImageUrl)}
                            className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300"
                          >
                            {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                            <span>{copied ? t('admin.pagesPage.copied') : t('admin.pagesPage.copyLink')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertAtCursor(`<img src="${uploadedImageUrl}" alt="Hình ảnh" class="max-w-full rounded-xl my-6 shadow-md" />`, 'new-page-content')}
                            className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            <Plus size={10} />
                            <span>{t('admin.pagesPage.insertImage')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                    {t('admin.pagesPage.imageAssistantDesc')}
                  </p>
                </div>

                {/* SEO Configuration Section */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 border-b border-gray-200/80 pb-2 dark:border-gray-700/80">
                    <Globe size={14} className="text-blue-500" /> {t('admin.pagesPage.seoConfigTitle', { defaultValue: 'Cấu hình SEO' })}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.pagesPage.seoTitleLabel', { defaultValue: 'SEO Title (Tiêu đề SEO)' })}</label>
                      <input
                        type="text"
                        value={newPageData.seo_title || ''}
                        onChange={(e) => setNewPageData({ ...newPageData, seo_title: e.target.value })}
                        placeholder={t('admin.pagesPage.seoTitlePlaceholder', { defaultValue: 'Để trống để tự động lấy tên trang...' })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.pagesPage.seoDescriptionLabel', { defaultValue: 'SEO Description (Mô tả SEO)' })}</label>
                      <textarea
                        value={newPageData.seo_description || ''}
                        onChange={(e) => setNewPageData({ ...newPageData, seo_description: e.target.value })}
                        placeholder={t('admin.pagesPage.seoDescriptionPlaceholder', { defaultValue: 'Nhập mô tả ngắn cho công cụ tìm kiếm...' })}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.pagesPage.seoKeywordsLabel', { defaultValue: 'SEO Keywords (Từ khóa SEO)' })}</label>
                      <input
                        type="text"
                        value={newPageData.seo_keywords || ''}
                        onChange={(e) => setNewPageData({ ...newPageData, seo_keywords: e.target.value })}
                        placeholder={t('admin.pagesPage.seoKeywordsPlaceholder', { defaultValue: 'gốm sứ, cổ vật, bình gốm,...' })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Visual Preview */}
              <div className="flex-1 flex flex-col gap-2 border-l border-gray-100 pl-6 dark:border-gray-700 overflow-hidden">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  {t('admin.pagesPage.previewTitle')}
                </label>
                <div 
                  className="flex-1 w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-y-auto prose dark:prose-invert max-w-none text-left"
                  dangerouslySetInnerHTML={{
                    __html: newPageData.content || `<div class="text-gray-400 italic text-center py-12">${t('common.empty')}</div>`
                  }}
                />
              </div>
            </form>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('admin.pagesPage.cancel')}
              </button>
              <button
                type="submit"
                form="add-page-form"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500"
              >
                {isSubmitting ? t('admin.pagesPage.adding') : t('admin.pagesPage.add')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
