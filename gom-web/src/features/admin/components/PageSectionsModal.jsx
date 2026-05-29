import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, FileText, Plus, Trash2, Upload, Copy, Check, Link as LinkIcon, Image as ImageIcon, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api';
import { storageApi } from '../../../lib/storageApi';
import { getErrorMessage } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

/**
 * Mapping: slug → list of editable i18n sections.
 * Each section = { key: i18n key, label: Vietnamese label for admin, multiline: bool }
 */
const PAGE_SECTIONS_MAP = {
  about: [
    { key: 'about.eyebrow', label: 'Eyebrow (trên tiêu đề)', multiline: false },
    { key: 'about.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'about.subtitle', label: 'Phụ đề', multiline: true },
    { key: 'about.features.accuracy.title', label: 'Tính năng 1 – Tiêu đề', multiline: false },
    { key: 'about.features.accuracy.desc', label: 'Tính năng 1 – Mô tả', multiline: true },
    { key: 'about.features.data.title', label: 'Tính năng 2 – Tiêu đề', multiline: false },
    { key: 'about.features.data.desc', label: 'Tính năng 2 – Mô tả', multiline: true },
    { key: 'about.features.community.title', label: 'Tính năng 3 – Tiêu đề', multiline: false },
    { key: 'about.features.community.desc', label: 'Tính năng 3 – Mô tả', multiline: true },
    { key: 'about.mission.title', label: 'Sứ mệnh – Tiêu đề', multiline: false },
    { key: 'about.mission.p1', label: 'Sứ mệnh – Đoạn 1', multiline: true },
    { key: 'about.mission.p2', label: 'Sứ mệnh – Đoạn 2', multiline: true },
  ],
  contact: [
    { key: 'contact.eyebrow', label: 'Eyebrow', multiline: false },
    { key: 'contact.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'contact.subtitle', label: 'Phụ đề', multiline: true },
    { key: 'contact.info.email', label: 'Tiêu đề Email', multiline: false },
    { key: 'contact.info.emailNote', label: 'Ghi chú Email', multiline: false },
    { key: 'contact.info.phone', label: 'Tiêu đề Hotline', multiline: false },
    { key: 'contact.info.phoneNote', label: 'Ghi chú Hotline', multiline: false },
    { key: 'contact.info.address', label: 'Tiêu đề Địa chỉ', multiline: false },
    { key: 'contact.info.addressValue', label: 'Giá trị Địa chỉ', multiline: false },
    { key: 'contact.info.addressNote', label: 'Ghi chú Địa chỉ', multiline: false },
    { key: 'contact.form.title', label: 'Form – Tiêu đề', multiline: false },
    { key: 'contact.form.subtitle', label: 'Form – Phụ đề', multiline: true },
    { key: 'contact.system.title', label: 'Cam kết hệ thống – Tiêu đề', multiline: false },
    { key: 'contact.faq.title', label: 'FAQ – Tiêu đề', multiline: false },
    { key: 'contact.faq.q1', label: 'FAQ – Câu hỏi 1', multiline: false },
    { key: 'contact.faq.a1', label: 'FAQ – Trả lời 1', multiline: true },
    { key: 'contact.faq.q2', label: 'FAQ – Câu hỏi 2', multiline: false },
    { key: 'contact.faq.a2', label: 'FAQ – Trả lời 2', multiline: true },
    { key: 'contact.faq.q3', label: 'FAQ – Câu hỏi 3', multiline: false },
    { key: 'contact.faq.a3', label: 'FAQ – Trả lời 3', multiline: true },
  ],
  terms: [
    { key: 'legal.terms.seoTitle', label: 'SEO: Meta Title', multiline: false },
    { key: 'legal.terms.seoDescription', label: 'SEO: Meta Description', multiline: true },
    { key: 'legal.terms.seoKeywords', label: 'SEO: Meta Keywords', multiline: false },
    { key: 'legal.terms.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'legal.terms.subtitle', label: 'Phụ đề', multiline: true },
    { key: 'legal.terms.s1Title', label: 'Mục 1 – Tiêu đề', multiline: false },
    { key: 'legal.terms.s1Body', label: 'Mục 1 – Nội dung', multiline: true },
    { key: 'legal.terms.s2Title', label: 'Mục 2 – Tiêu đề', multiline: false },
    { key: 'legal.terms.s2Body', label: 'Mục 2 – Nội dung', multiline: true },
    { key: 'legal.terms.s3Title', label: 'Mục 3 – Tiêu đề', multiline: false },
    { key: 'legal.terms.s3Body', label: 'Mục 3 – Nội dung', multiline: true },
    { key: 'legal.terms.s4Title', label: 'Mục 4 – Tiêu đề', multiline: false },
    { key: 'legal.terms.s4Body', label: 'Mục 4 – Nội dung', multiline: true },
  ],
  privacy: [
    { key: 'legal.privacy.seoTitle', label: 'SEO: Meta Title', multiline: false },
    { key: 'legal.privacy.seoDescription', label: 'SEO: Meta Description', multiline: true },
    { key: 'legal.privacy.seoKeywords', label: 'SEO: Meta Keywords', multiline: false },
    { key: 'legal.privacy.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'legal.privacy.subtitle', label: 'Phụ đề', multiline: true },
    { key: 'legal.privacy.s1Title', label: 'Mục 1 – Tiêu đề', multiline: false },
    { key: 'legal.privacy.s1Body', label: 'Mục 1 – Nội dung', multiline: true },
    { key: 'legal.privacy.s2Title', label: 'Mục 2 – Tiêu đề', multiline: false },
    { key: 'legal.privacy.s3Title', label: 'Mục 3 – Tiêu đề', multiline: false },
    { key: 'legal.privacy.s3Body', label: 'Mục 3 – Nội dung', multiline: true },
    { key: 'legal.privacy.s4Title', label: 'Mục 4 – Tiêu đề', multiline: false },
    { key: 'legal.privacy.s4Body', label: 'Mục 4 – Nội dung', multiline: true },
  ],
  home: [
    { key: 'home.seoTitle', label: 'SEO: Meta Title', multiline: false },
    { key: 'home.seoDescription', label: 'SEO: Meta Description', multiline: true },
    { key: 'home.seoKeywords', label: 'SEO: Meta Keywords', multiline: false },
    { key: 'home.heroEyebrow', label: 'Eyebrow Hero', multiline: false },
    { key: 'home.heroPrefix', label: 'Tiêu đề Hero – Prefix', multiline: false },
    { key: 'home.heroSuffix', label: 'Tiêu đề Hero – Suffix', multiline: false },
    { key: 'home.heroRotatingWords', label: 'Các từ hiệu ứng xoay (cách nhau bằng dấu phẩy)', multiline: false },
    { key: 'home.heroImages', label: 'Link ảnh Slide (cách nhau bằng dấu phẩy, để trống sẽ tự lấy Dòng gốm nổi bật)', multiline: true },
    { key: 'home.heroSubtitle', label: 'Hero – Phụ đề', multiline: true },
    { key: 'home.trust.expert', label: 'Tin cậy 1 – Tiêu đề', multiline: false },
    { key: 'home.trust.expertDesc', label: 'Tin cậy 1 – Mô tả', multiline: true },
    { key: 'home.trust.secure', label: 'Tin cậy 2 – Tiêu đề', multiline: false },
    { key: 'home.trust.secureDesc', label: 'Tin cậy 2 – Mô tả', multiline: true },
    { key: 'home.trust.instant', label: 'Tin cậy 3 – Tiêu đề', multiline: false },
    { key: 'home.trust.instantDesc', label: 'Tin cậy 3 – Mô tả', multiline: true },
    { key: 'home.featured.title', label: 'Gốm nổi bật – Tiêu đề', multiline: false },
  ],
  ceramics: [
    { key: 'ceramics.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'ceramics.subtitle', label: 'Phụ đề', multiline: true },
    { key: 'ceramics.searchPlaceholder', label: 'Placeholder ô tìm kiếm', multiline: false },
  ],
  history: [
    { key: 'history.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'history.subtitle', label: 'Phụ đề', multiline: true },
    { key: 'history.empty', label: 'Thông báo khi rỗng', multiline: false },
  ],
  header: [
    { key: 'app.name', label: 'Tên ứng dụng (Navbar/Footer)', multiline: false },
    { key: 'header.navItems', label: 'Menu Header (Thêm/Sửa/Xóa link)', type: 'linkList' },
    { key: 'app.tagline', label: 'Khẩu hiệu (Tagline Footer)', multiline: false },
    { key: 'nav.home', label: 'Label: Trang chủ', multiline: false },
    { key: 'nav.lines', label: 'Label: Dòng gốm', multiline: false },
    { key: 'nav.history', label: 'Label: Lịch sử', multiline: false },
    { key: 'nav.contact', label: 'Label: Liên hệ', multiline: false },
    { key: 'nav.about', label: 'Label: Về chúng tôi', multiline: false },
    { key: 'header.myProfile', label: 'Menu Dropdown: Hồ sơ', multiline: false },
    { key: 'header.transactionHistory', label: 'Menu Dropdown: Lịch sử giao dịch', multiline: false },
    { key: 'header.topup', label: 'Menu Dropdown: Nạp lượt', multiline: false },
    { key: 'header.topupShort', label: 'Nút: Nạp lượt', multiline: false },
  ],
  footer: [
    { key: 'footer.product', label: 'Tiêu đề Cột 1', multiline: false },
    { key: 'footer.productLinks', label: 'Link Cột 1 (Sản phẩm)', type: 'linkList' },
    { key: 'footer.support', label: 'Tiêu đề Cột 2', multiline: false },
    { key: 'footer.supportLinks', label: 'Link Cột 2 (Hỗ trợ)', type: 'linkList' },
    { key: 'footer.company', label: 'Tiêu đề Cột 3', multiline: false },
    { key: 'nav.payment', label: 'Label: Nạp lượt', multiline: false },
    { key: 'nav.terms', label: 'Label: Điều khoản', multiline: false },
    { key: 'nav.privacy', label: 'Label: Bảo mật', multiline: false },
  ],
  ceramics: [
    { key: 'ceramics.seoTitle', label: 'SEO: Meta Title', multiline: false },
    { key: 'ceramics.seoDescription', label: 'SEO: Meta Description', multiline: true },
    { key: 'ceramics.seoKeywords', label: 'SEO: Meta Keywords', multiline: false },
    { key: 'ceramics.title', label: 'Tiêu đề trang', multiline: false },
    { key: 'ceramics.subtitle', label: 'Mô tả trang', multiline: true },
    { key: 'ceramics.searchPlaceholder', label: 'Gợi ý tìm kiếm', multiline: false },
  ],
};

export const PageSectionsModal = ({ pageData, onClose, onSuccess, notify }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [sections, setSections] = useState({});
  const [changedKeys, setChangedKeys] = useState(new Set());
  const [customContent, setCustomContent] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [copied, setCopied] = useState(false);

  const sectionsDef = PAGE_SECTIONS_MAP[pageData?.slug] || [];

  const insertAtCursor = (text, textareaId) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      setCustomContent(prev => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    setCustomContent(newValue);
    
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
    if (!pageData) return;
    setTitle(pageData.title || '');
    setTitleEn(pageData.title_en || '');
    setSlug(pageData.slug || '');
    setSeoTitle(pageData.seo_title || '');
    setSeoDescription(pageData.seo_description || '');
    setSeoKeywords(pageData.seo_keywords || '');

    if (sectionsDef.length === 0) {
      setCustomContent(pageData.content || '');
      return;
    }

    // Parse existing overrides from DB
    let existingOverrides = {};
    if (pageData.content) {
      try {
        existingOverrides = JSON.parse(pageData.content);
      } catch {
        existingOverrides = {};
      }
    }

    // Helper to get default value and handle arrays
    const getDefaultValue = (key, secType) => {
      const val = t(key, { returnObjects: true, defaultValue: '' });
      if (secType === 'linkList') {
        return Array.isArray(val) ? val : [];
      }
      if (Array.isArray(val)) {
        return val.join(', ');
      }
      return val;
    };

    // Pre-fill: use DB override if exists, else current i18n value
    const initial = {};
    for (const sec of sectionsDef) {
      initial[sec.key] = existingOverrides[sec.key] ?? getDefaultValue(sec.key, sec.type);
    }
    setSections(initial);
    setChangedKeys(new Set(Object.keys(existingOverrides)));
  }, [pageData, t]);

  const handleSectionChange = (key, value) => {
    setSections((prev) => ({ ...prev, [key]: value }));
    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const getDefaultValueForReset = (key, secType) => {
      const val = t(key, { returnObjects: true, defaultValue: '' });
      if (secType === 'linkList') {
        return Array.isArray(val) ? val : [];
      }
      if (Array.isArray(val)) {
        return val.join(', ');
      }
      return val;
  };

  const handleReset = (key, secType) => {
    // Reset to default i18n value
    const defaultVal = getDefaultValueForReset(key, secType);
    setSections((prev) => ({ ...prev, [key]: defaultVal }));
    setChangedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let contentPayload = '';
      if (sectionsDef.length === 0) {
        contentPayload = customContent;
      } else {
        // Only save keys that differ from i18n defaults
        const overrides = {};
        for (const sec of sectionsDef) {
          const defaultVal = getDefaultValueForReset(sec.key, sec.type);
          const isModified = sec.type === 'linkList' 
            ? JSON.stringify(sections[sec.key]) !== JSON.stringify(defaultVal)
            : sections[sec.key] !== defaultVal;

          if (changedKeys.has(sec.key) && isModified) {
            overrides[sec.key] = sections[sec.key];
          }
        }
        contentPayload = JSON.stringify(overrides);
      }

      await adminApi.updatePage(pageData.id, {
        title,
        title_en: titleEn || null,
        slug,
        content: contentPayload,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_keywords: seoKeywords,
      });
      notify?.(t('admin.pagesPage.saveSuccess'), 'success');
      onSuccess();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const isOverridden = (key, secType) => {
    const defaultVal = getDefaultValueForReset(key, secType);
    if (!changedKeys.has(key)) return false;
    if (secType === 'linkList') {
      return JSON.stringify(sections[key]) !== JSON.stringify(defaultVal);
    }
    return sections[key] !== defaultVal;
  };

  const updateLinkList = (key, newArray) => {
    setSections((prev) => ({ ...prev, [key]: newArray }));
    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const renderImageAssistant = (textareaId) => {
    return (
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
                {textareaId && (
                  <button
                    type="button"
                    onClick={() => insertAtCursor(`<img src="${uploadedImageUrl}" alt="Hình ảnh" class="max-w-full rounded-xl my-6 shadow-md" />`, textareaId)}
                    className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    <Plus size={10} />
                    <span>{t('admin.pagesPage.insertImage')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          {t('admin.pagesPage.imageAssistantDesc')}
        </p>
      </div>
    );
  };

  return (
    <Modal open={!!pageData} onClose={onClose} size="xl" showCloseButton={false}>
      <div className="flex h-full flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('admin.pagesPage.editModal.title', { title: pageData?.title })}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('admin.pagesPage.editModal.subtitle', { slug: pageData?.slug })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <form id="page-sections-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Page Title & Slug Row */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('admin.pagesPage.pageNameVi', { defaultValue: 'Tên trang (Tiếng Việt) *' })}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('admin.pagesPage.pageNameEn', { defaultValue: 'Tên trang (Tiếng Anh)' })}
                </label>
                <input
                  type="text"
                  value={titleEn || ''}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g., About Us"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('admin.pagesPage.editModal.slugLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Split Screen Layout for Custom Page (sectionsDef.length === 0) */}
            {sectionsDef.length === 0 ? (
              <div className="flex-1 min-h-[400px] flex flex-col lg:flex-row gap-6 mt-2">
                {/* Left side: HTML Textarea Editor & Image Upload Assistant */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  <div className="flex-1 flex flex-col min-h-[200px]">
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('admin.pagesPage.editorTitle')}
                    </label>
                    <textarea
                      id="edit-page-content"
                      value={customContent}
                      onChange={(e) => setCustomContent(e.target.value)}
                      placeholder={t('admin.pagesPage.pageContentPlaceholder')}
                      className="w-full flex-1 min-h-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                    />
                  </div>

                  {/* Image Upload Assistant */}
                  {renderImageAssistant('edit-page-content')}

                  {/* SEO Configuration Section */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50 text-left">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 border-b border-gray-200/80 pb-2 dark:border-gray-700/80">
                      <Globe size={14} className="text-blue-500" /> {t('admin.pagesPage.seoConfigTitle', { defaultValue: 'Cấu hình SEO' })}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.pagesPage.seoTitleLabel', { defaultValue: 'SEO Title (Tiêu đề SEO)' })}</label>
                        <input
                          type="text"
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          placeholder={t('admin.pagesPage.seoTitlePlaceholder', { defaultValue: 'Để trống để tự động lấy tên trang...' })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.pagesPage.seoDescriptionLabel', { defaultValue: 'SEO Description (Mô tả SEO)' })}</label>
                        <textarea
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder={t('admin.pagesPage.seoDescriptionPlaceholder', { defaultValue: 'Nhập mô tả ngắn cho công cụ tìm kiếm...' })}
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">{t('admin.pagesPage.seoKeywordsLabel', { defaultValue: 'SEO Keywords (Từ khóa SEO)' })}</label>
                        <input
                          type="text"
                          value={seoKeywords}
                          onChange={(e) => setSeoKeywords(e.target.value)}
                          placeholder={t('admin.pagesPage.seoKeywordsPlaceholder', { defaultValue: 'gốm sứ, cổ vật, bình gốm,...' })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Live Visual Preview */}
                <div className="flex-1 flex flex-col gap-2 border-l border-gray-100 pl-6 dark:border-gray-700 overflow-hidden text-left">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    {t('admin.pagesPage.previewTitle')}
                  </label>
                  <div 
                    className="flex-1 w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-y-auto prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: customContent || `<div class="text-gray-400 italic text-center py-12">${t('common.empty')}</div>`
                    }}
                  />
                </div>
              </div>
            ) : (
              // Structured Page Layout (sectionsDef.length > 0)
              <div className="space-y-5">
                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {t('admin.pagesPage.editModal.sectionHeader', { count: sectionsDef.length })}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* Info banner */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  {t('admin.pagesPage.editModal.infoBanner')}
                </div>

                {/* Sections list */}
                <div className="space-y-4">
                  {sectionsDef.map((sec) => {
                    const modified = isOverridden(sec.key, sec.type);
                    return (
                      <div
                        key={sec.key}
                        className={`rounded-lg border p-3 transition-colors ${
                          modified
                            ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {sec.label}
                            {modified && (
                              <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {t('admin.pagesPage.editModal.editedBadge')}
                              </span>
                            )}
                          </label>
                          {modified && (
                            <button
                              type="button"
                              onClick={() => handleReset(sec.key, sec.type)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              title={t('admin.pagesPage.editModal.defaultBtn')}
                            >
                              <RotateCcw size={12} />
                              {t('admin.pagesPage.editModal.defaultBtn')}
                            </button>
                          )}
                        </div>
                        {sec.type === 'linkList' ? (
                          <div className="space-y-2 mt-2">
                            {(Array.isArray(sections[sec.key]) ? sections[sec.key] : []).map((linkItem, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={linkItem.label || ''}
                                  onChange={(e) => {
                                    const arr = [...sections[sec.key]];
                                    arr[idx] = { ...arr[idx], label: e.target.value };
                                    updateLinkList(sec.key, arr);
                                  }}
                                  placeholder={t('admin.pagesPage.editModal.displayNamePlaceholder')}
                                  className="w-1/3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={linkItem.href || ''}
                                  onChange={(e) => {
                                    const arr = [...sections[sec.key]];
                                    arr[idx] = { ...arr[idx], href: e.target.value };
                                    updateLinkList(sec.key, arr);
                                  }}
                                  placeholder={t('admin.pagesPage.editModal.linkPathPlaceholder')}
                                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const arr = [...sections[sec.key]];
                                    arr.splice(idx, 1);
                                    updateLinkList(sec.key, arr);
                                  }}
                                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const arr = [...(Array.isArray(sections[sec.key]) ? sections[sec.key] : [])];
                                arr.push({ label: '', href: '/' });
                                updateLinkList(sec.key, arr);
                              }}
                              className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              <Plus size={14} /> {t('admin.pagesPage.editModal.addNewLink')}
                            </button>
                          </div>
                        ) : sec.multiline ? (
                          <textarea
                            value={sections[sec.key] || ''}
                            onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={sections[sec.key] || ''}
                            onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                        <p className="mt-1 text-[10px] font-mono text-gray-400 dark:text-gray-500">
                          {sec.key}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Structured Page Image Upload Assistant */}
                <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-700 text-left">
                  {renderImageAssistant(null)}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 p-4 dark:border-gray-700 mt-auto shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {sectionsDef.length > 0 ? (
              changedKeys.size > 0
                ? t('admin.pagesPage.editModal.changedCount', { count: Array.from(changedKeys).filter((k) => isOverridden(k)).length })
                : t('admin.pagesPage.editModal.noChanges')
            ) : (
              ''
            )}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t('admin.pagesPage.editModal.cancelBtn')}
            </Button>
            <Button type="submit" form="page-sections-form" loading={loading}>
              <Save size={16} className="mr-2" />
              {loading ? t('admin.pagesPage.editModal.savingBtn') : t('admin.pagesPage.editModal.saveBtn')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
