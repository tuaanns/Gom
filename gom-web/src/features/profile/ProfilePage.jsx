import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Lock, Save, Camera, Trash2 } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input, Label } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { profileApi } from './api';
import { storageApi } from '../../lib/storageApi';
import { cn, getErrorMessage } from '../../lib/utils';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const TABS = [
  { id: 'info', icon: User },
  { id: 'password', icon: Lock },
  { id: 'danger', icon: Trash2 },
];

export const ProfilePage = ({ user, quota, fetchUser, notify, logout }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [wantToDelete, setWantToDelete] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDeleteAccountSubmit = (e) => {
    e.preventDefault();
    if (confirmText !== user?.email) {
      notify?.(t('profile.confirmEmailMismatch', { defaultValue: 'Email xác nhận không khớp.' }), 'error');
      return;
    }
    if (wantToDelete !== 'yes') {
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleDeleteAccountConfirm = async () => {
    setDeleteModalOpen(false);
    setDeleting(true);
    try {
      await profileApi.deleteAccount();
      notify?.(t('profile.deleteSuccess', { defaultValue: 'Tài khoản của bạn đã được xóa thành công.' }), 'success');
      
      // Perform local logout cleanup
      await logout?.();
      
      // Redirect to home/auth page
      window.location.href = '/#/auth';
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onPwdChange = (e) => setPwd((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify?.(t('errors.invalidFileType'), 'error');
      return;
    }

    // Validate file size (max 5MB to match backend)
    if (file.size > 5 * 1024 * 1024) {
      notify?.(t('errors.fileSizeLimit'), 'error');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let avatarUrl = null;

      // Step 1: Upload avatar to Azure Blob Storage if file is selected
      if (avatarFile) {
        notify?.(t('profile.uploadingAvatar'), 'info');
        const uploadResult = await storageApi.uploadSingle(avatarFile, 'avatars');
        avatarUrl = uploadResult.fileUrl;
      }

      // Step 2: Update profile with avatar URL
      const updateData = {
        name: form.name,
        phone: form.phone || '',
      };

      if (avatarUrl) {
        updateData.avatar = avatarUrl;
      }

      await profileApi.update(updateData);
      await fetchUser?.();
      setAvatarFile(null);
      setAvatarPreview(null);
      notify?.(t('profile.saved'), 'success');
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitPwd = async (e) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) {
      notify?.(t('auth.passwordMismatch'), 'error');
      return;
    }
    if (pwd.next.length < 6) {
      notify?.(t('errors.validation'), 'error');
      return;
    }
    setChanging(true);
    try {
      await profileApi.changePassword({
        current_password: pwd.current,
        new_password: pwd.next,
        new_password_confirmation: pwd.confirm,
      });
      setPwd({ current: '', next: '', confirm: '' });
      notify?.(t('profile.passwordChanged'), 'success');
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setChanging(false);
    }
  };

  const remainingFree = Math.max(0, (quota?.free_limit ?? 5) - (quota?.free_used ?? 0));

  return (
    <PageContainer narrow>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <Card>
        <div className="mb-8 flex flex-col items-center gap-4 border-b border-stroke pb-8 text-center dark:border-dark-stroke md:flex-row md:items-start md:text-left">
          <div className="relative">
            <Avatar
              src={avatarPreview || user?.avatar}
              name={user?.name}
              size="xl"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-navy text-white shadow-lg transition-all hover:bg-navy-light hover:scale-110 dark:bg-ceramic dark:text-navy-dark dark:hover:bg-ceramic-hover"
            >
              <Camera size={18} />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-2xl font-bold text-navy dark:text-ivory">
              {user?.name}
            </h3>
            <p className="text-sm text-muted dark:text-dark-text-muted">{user?.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {user?.role === 'admin' && <Badge variant="gold">Admin</Badge>}
              <Badge variant="info">
                {user?.token_balance ?? 0} {t('payment.credits')}
              </Badge>
              <Badge variant="success">
                {remainingFree} {t('header.freeQuota')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-stroke dark:border-dark-stroke">
          {TABS.map((t2) => (
            <button
              key={t2.id}
              type="button"
              onClick={() => setTab(t2.id)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors',
                tab === t2.id
                  ? 'border-ceramic text-navy dark:text-ivory'
                  : 'border-transparent text-muted hover:text-navy dark:text-dark-text-muted dark:hover:text-ivory'
              )}
            >
              <t2.icon size={16} />
              {t('profile.tabs.' + t2.id)}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <form onSubmit={submitInfo} className="space-y-4">
            {avatarPreview && (
              <div className="rounded-lg bg-ceramic/10 p-3 text-sm text-ceramic-dark dark:bg-ceramic/20">
                <p className="font-semibold">{t('profile.newAvatarSelected')}</p>
                <p className="text-xs">{t('profile.savePrompt')}</p>
              </div>
            )}
            <div>
              <Label>{t('profile.fields.name')}</Label>
              <Input name="name" value={form.name} onChange={onChange} leftIcon={<User size={16} />} required />
            </div>
            <div>
              <Label>{t('profile.fields.email')}</Label>
              <Input name="email" type="email" value={form.email} disabled leftIcon={<Mail size={16} />} />
            </div>
            <div>
              <Label>{t('profile.fields.phone')}</Label>
              <Input name="phone" value={form.phone} onChange={onChange} leftIcon={<Phone size={16} />} />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
              leftIcon={!saving && <Save size={16} />}
            >
              {saving ? t('common.saving') : t('profile.save')}
            </Button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={submitPwd} className="space-y-4">
            <div>
              <Label>{t('profile.fields.currentPassword')}</Label>
              <Input
                name="current"
                type="password"
                value={pwd.current}
                onChange={onPwdChange}
                leftIcon={<Lock size={16} />}
                required
              />
            </div>
            <div>
              <Label>{t('profile.fields.newPassword')}</Label>
              <Input
                name="next"
                type="password"
                value={pwd.next}
                onChange={onPwdChange}
                leftIcon={<Lock size={16} />}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label>{t('profile.fields.confirmPassword')}</Label>
              <Input
                name="confirm"
                type="password"
                value={pwd.confirm}
                onChange={onPwdChange}
                leftIcon={<Lock size={16} />}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={changing}
              leftIcon={!changing && <Save size={16} />}
            >
              {changing ? t('common.saving') : t('profile.save')}
            </Button>
          </form>
        )}

        {tab === 'danger' && (
          <div className="space-y-6 rounded-xl border border-red-200/50 bg-red-50/50 p-6 dark:border-red-900/30 dark:bg-red-950/10">
            <div>
              <h4 className="font-heading text-lg font-bold text-red-600 dark:text-red-400">
                {t('profile.dangerZone', { defaultValue: 'Vùng Nguy Hiểm' })}
              </h4>
              <p className="mt-1 text-sm text-muted dark:text-dark-text-muted">
                {t('profile.dangerDesc', { defaultValue: 'Xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan. Hành động này không thể hoàn tác.' })}
              </p>
            </div>
            
            <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
              <div>
                <Label className="text-red-700 dark:text-red-400">
                  {t('profile.wantToDeleteLabel', { defaultValue: 'Bạn có muốn xóa tài khoản không?' })}
                </Label>
                <div className="mt-1">
                  <select
                    value={wantToDelete}
                    onChange={(e) => setWantToDelete(e.target.value)}
                    required
                    className="w-full rounded-lg border border-red-200 bg-white p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 dark:border-red-900/30 dark:bg-dark-surface dark:text-white"
                  >
                    <option value="">{t('profile.selectOption', { defaultValue: 'Vui lòng chọn...' })}</option>
                    <option value="yes">{t('profile.optionYes', { defaultValue: 'Có, tôi muốn xóa tài khoản' })}</option>
                    <option value="no">{t('profile.optionNo', { defaultValue: 'Không, tôi muốn giữ lại' })}</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-red-700 dark:text-red-400">
                  {t('profile.confirmEmailLabel', { defaultValue: 'Để xác nhận, vui lòng nhập lại địa chỉ email của bạn:' })}
                </Label>
                <div className="mt-1">
                  <Input
                    name="confirmText"
                    type="text"
                    placeholder={user?.email}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    required
                    className="border-red-300 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="danger"
                size="lg"
                loading={deleting}
                disabled={confirmText !== user?.email || wantToDelete !== 'yes'}
                leftIcon={!deleting && <Trash2 size={16} />}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? t('common.deleting', { defaultValue: 'Đang xóa...' }) : t('profile.deleteAccountBtn', { defaultValue: 'Xóa tài khoản vĩnh viễn' })}
              </Button>
            </form>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccountConfirm}
        title={t('profile.confirmModalTitle', { defaultValue: 'Xác nhận xóa tài khoản vĩnh viễn' })}
        message={t('profile.confirmModalMessage', { defaultValue: 'Hành động này sẽ xóa toàn bộ dữ liệu và không thể hoàn tác. Bạn có thực sự chắc chắn muốn tiếp tục?' })}
        confirmText={t('profile.deleteAccountBtn', { defaultValue: 'Xóa tài khoản vĩnh viễn' })}
        cancelText={t('common.cancel', { defaultValue: 'Hủy' })}
        isDanger={true}
        loading={deleting}
      />
    </PageContainer>
  );
};

export default ProfilePage;

