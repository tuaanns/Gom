import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api';
import { getErrorMessage } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Checkbox, FormField, Input, Select } from '../components/FormField';

const EMPTY_MODEL = {
  id: '',
  name: '',
  provider: 'groq',
  role: 'agent_text',
  is_active: true,
};

const API_KEY_FIELDS = ['GOOGLE_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY'];
const PROVIDERS = ['google', 'groq', 'openai'];
const ROLES = ['vision', 'agent_text', 'historian', 'kiln', 'global', 'judge', 'chat'];

export const ApiSettingsPage = ({ notify }) => {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState({});
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const activeModels = useMemo(() => models.filter((model) => model.is_active).length, [models]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getApiSettings();
      const data = res.data?.data || {};
      setApiKeys(data.api_keys || {});
      setModels(Array.isArray(data.models) ? data.models : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = (key, value) => {
    setApiKeys((prev) => ({ ...prev, [key]: value }));
  };

  const updateModel = (index, patch) => {
    setModels((prev) => prev.map((model, i) => (i === index ? { ...model, ...patch } : model)));
  };

  const addModel = () => {
    setModels((prev) => [...prev, { ...EMPTY_MODEL }]);
  };

  const removeModel = (index) => {
    setModels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        api_keys: API_KEY_FIELDS.reduce((acc, key) => ({ ...acc, [key]: apiKeys[key] || '' }), {}),
        models: models.map((model) => ({
          id: model.id.trim(),
          name: (model.name || model.id).trim(),
          provider: model.provider,
          role: model.role,
          is_active: Boolean(model.is_active),
        })),
      };
      const res = await adminApi.updateApiSettings(payload);
      const data = res.data?.data || {};
      const config = data.config || payload;
      setApiKeys(config.api_keys || {});
      setModels(Array.isArray(config.models) ? config.models : []);
      setSyncStatus(data.sync_status || null);
      notify?.(res.data?.message || t('admin.apiSettingsPage.saveSuccess'), 'success');
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.apiSettingsPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('admin.apiSettingsPage.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchSettings} leftIcon={<RefreshCw size={16} />}>
            {t('admin.apiSettingsPage.reload')}
          </Button>
          <Button onClick={handleSave} loading={saving} leftIcon={<Save size={16} />}>
            {t('admin.apiSettingsPage.save')}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.apiSettingsPage.keysTitle')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.apiSettingsPage.keysDesc')}</p>
            </div>
          </div>
          {syncStatus && <Badge variant={syncStatus === 'synced' ? 'success' : 'warning'}>{syncStatus}</Badge>}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {API_KEY_FIELDS.map((key) => (
            <FormField key={key} label={key}>
              <Input
                type="password"
                value={apiKeys[key] || ''}
                onChange={(event) => updateApiKey(key, event.target.value)}
                placeholder={t('admin.apiSettingsPage.keyPlaceholder')}
                autoComplete="off"
              />
            </FormField>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.apiSettingsPage.modelsTitle')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.apiSettingsPage.modelsDesc', { active: activeModels, total: models.length })}
            </p>
          </div>
          <Button variant="secondary" onClick={addModel} leftIcon={<Plus size={16} />}>
            {t('admin.apiSettingsPage.addModel')}
          </Button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {models.map((model, index) => (
            <div key={`${model.id}-${index}`} className="grid gap-4 p-6 lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto_auto] lg:items-end">
              <FormField label={t('admin.apiSettingsPage.modelId')}>
                <Input value={model.id} onChange={(event) => updateModel(index, { id: event.target.value })} placeholder="llama-3.3-70b-versatile" />
              </FormField>
              <FormField label={t('admin.apiSettingsPage.modelName')}>
                <Input value={model.name || ''} onChange={(event) => updateModel(index, { name: event.target.value })} placeholder="Llama 3.3 70B" />
              </FormField>
              <FormField label={t('admin.apiSettingsPage.provider')}>
                <Select value={model.provider} onChange={(event) => updateModel(index, { provider: event.target.value })}>
                  {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                </Select>
              </FormField>
              <FormField label={t('admin.apiSettingsPage.role')}>
                <Select value={model.role} onChange={(event) => updateModel(index, { role: event.target.value })}>
                  {ROLES.map((role) => <option key={role} value={role}>{t(`admin.apiSettingsPage.roles.${role}`)}</option>)}
                </Select>
              </FormField>
              <div className="pb-2">
                <Checkbox
                  label={t('admin.apiSettingsPage.active')}
                  checked={Boolean(model.is_active)}
                  onChange={(event) => updateModel(index, { is_active: event.target.checked })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeModel(index)}
                className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                title={t('admin.apiSettingsPage.deleteModel')}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {models.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('admin.apiSettingsPage.noModels')}</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ApiSettingsPage;
