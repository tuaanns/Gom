import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { FormField, Input, Select } from './FormField';
import { adminApi } from '../api';
import { storageApi } from '../../../lib/storageApi';
import { getErrorMessage } from '../../../lib/utils';

export const UserModal = ({ isOpen, onClose, user, onSuccess, notify }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    token_balance: 0,
    free_limit: 5,
    avatar: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'user',
        token_balance: user.token_balance || 0,
        free_limit: user ? (user.free_limit - (user.free_used || 0)) : 5,
        avatar: user.avatar || '',
      });
      setAvatarPreview(user.avatar || null);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        token_balance: 0,
        free_limit: 5,
        avatar: '',
      });
      setAvatarPreview(null);
    }
    setAvatarFile(null);
    setErrors({});
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify?.(t('errors.invalidFileType'), 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify?.(t('errors.fileSizeLimit'), 'error');
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData((prev) => ({ ...prev, avatar: '' }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('errors.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.emailInvalid');
    }

    if (!user && !formData.password) {
      newErrors.password = t('errors.passwordRequired');
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = t('errors.passwordMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      let avatarUrl = formData.avatar;

      // Upload avatar if new file selected
      if (avatarFile) {
        setUploading(true);
        notify?.(t('profile.uploadingAvatar'), 'info');
        const uploadResult = await storageApi.uploadSingle(avatarFile, 'avatars');
        avatarUrl = uploadResult.fileUrl;
        setUploading(false);
      }

      const submitData = { 
        ...formData,
        avatar: avatarUrl,
      };
      
      // Remove password if empty (for edit)
      if (!submitData.password) {
        delete submitData.password;
      }

      if (user) {
        await adminApi.updateUser(user.id, submitData);
        notify?.(t('admin.usersPage.updateSuccess'), 'success');
      } else {
        // For create, we need to use register endpoint or create a new admin endpoint
        notify?.(t('admin.usersPage.createNeedsBackend'), 'info');
        // TODO: Implement create user endpoint in backend
      }

      onSuccess?.(user ? user.id : null);
      onClose();
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? t('admin.usersPage.editUser', 'Edit User') : t('admin.usersPage.addUser', 'Add New User')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Upload */}
        <FormField label="Avatar">
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <div className="relative">
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <label className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500">
              <Upload size={16} className="mr-2 inline" />
              Upload Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
        </FormField>

        <FormField label="Name" required error={errors.name}>
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter user name"
            error={errors.name}
          />
        </FormField>

        <FormField label="Email" required error={errors.email}>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="user@example.com"
            error={errors.email}
            disabled={!!user}
          />
        </FormField>

        {!user && (
          <FormField label="Password" required error={errors.password}>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              error={errors.password}
            />
          </FormField>
        )}

        <FormField label="Role" required>
          <Select name="role" value={formData.role} onChange={handleChange}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </FormField>

        <FormField label="Token Balance">
          <Input
            type="number"
            name="token_balance"
            value={formData.token_balance}
            onChange={handleChange}
            min="0"
            step="0.1"
          />
        </FormField>

        <FormField label="Free Remaining">
          <Input
            type="number"
            name="free_limit"
            value={formData.free_limit}
            onChange={handleChange}
            min="0"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading
              ? 'Uploading...'
              : loading
              ? 'Saving...'
              : user
              ? 'Update User'
              : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
