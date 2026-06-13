import { AlertTriangle, ChevronLeft, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/use-ai-chat-store';
import { DEFAULT_BASE_URLS, PROVIDER_LABEL } from '../models';
import type { CustomProvider } from '../providers/resolve';
import type { ProviderId } from '../providers/types';
import { PROVIDER_IDS } from '../providers/types';

const KEY_HELP_URL: Record<ProviderId, string> = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
};

const slugify = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `custom-${Date.now()}`;

type CustomProviderDraft = {
  /** edit 时填原 id，新建时由 slugify(label) 推导 */
  id: string | null;
  label: string;
  baseUrl: string;
  apiFormat: 'openai-compat' | 'anthropic';
  apiKey: string;
  /** 用户输入的逗号分隔字符串；保存时 split */
  modelsText: string;
};

const EMPTY_DRAFT: CustomProviderDraft = {
  id: null,
  label: '',
  baseUrl: '',
  apiFormat: 'openai-compat',
  apiKey: '',
  modelsText: '',
};

const draftFromProvider = (cp: CustomProvider): CustomProviderDraft => ({
  id: cp.id,
  label: cp.label,
  baseUrl: cp.baseUrl,
  apiFormat: cp.apiFormat,
  apiKey: cp.apiKey,
  modelsText: cp.models.join(', '),
});

export const AiChatSettings: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const setProvider = useAiChatStore(s => s.setProvider);
  const apiKeys = useAiChatStore(s => s.apiKeys);
  const setApiKey = useAiChatStore(s => s.setApiKey);
  const baseUrls = useAiChatStore(s => s.baseUrls);
  const setBaseUrl = useAiChatStore(s => s.setBaseUrl);
  const customProviders = useAiChatStore(s => s.customProviders);
  const upsertCustomProvider = useAiChatStore(s => s.upsertCustomProvider);
  const removeCustomProvider = useAiChatStore(s => s.removeCustomProvider);
  const setView = useAiChatStore(s => s.setView);

  const [showKey, setShowKey] = useState(false);
  const [draft, setDraft] = useState<CustomProviderDraft | null>(null);

  // segmented 当前 provider 切换：仅在 PROVIDER_IDS 内（自定义 provider 切换走 Model picker）
  const builtInProviderId = PROVIDER_IDS.includes(providerId as ProviderId)
    ? (providerId as ProviderId)
    : 'deepseek';
  const apiKey = apiKeys[builtInProviderId];
  const baseUrl = baseUrls[builtInProviderId];

  const startNew = () => setDraft({ ...EMPTY_DRAFT });
  const startEdit = (cp: CustomProvider) => setDraft(draftFromProvider(cp));
  const cancelDraft = () => setDraft(null);

  const saveDraft = () => {
    if (!draft) return;
    const trimmedLabel = draft.label.trim();
    const trimmedBase = draft.baseUrl.trim();
    if (!trimmedLabel || !trimmedBase) return;
    const id = draft.id ?? slugify(trimmedLabel);
    const models = draft.modelsText
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    upsertCustomProvider({
      id,
      label: trimmedLabel,
      baseUrl: trimmedBase,
      apiFormat: draft.apiFormat,
      apiKey: draft.apiKey.trim(),
      models,
    });
    setDraft(null);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer gap-1 px-2 text-sm"
          onClick={() => setView('main')}
        >
          <ChevronLeft className="size-4" />
          {t('ai.back')}
        </Button>
      </div>

      <div className="m-auto flex w-full max-w-md flex-col gap-5 px-4 py-4">
        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsProviderLabel')}
          </Label>
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {PROVIDER_IDS.map(id => (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className={cn(
                  'flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors',
                  builtInProviderId === id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {PROVIDER_LABEL[id]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsKeyLabel')}
          </Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(builtInProviderId, e.target.value)}
              placeholder={t('ai.settingsKeyPlaceholder')}
              className="pr-9 font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t('ai.settingsKeyHint')}{' '}
            <a
              href={KEY_HELP_URL[builtInProviderId]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {t('ai.settingsHowToGet')}
            </a>
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsBaseUrlLabel')}
          </Label>
          <Input
            value={baseUrl}
            onChange={e => setBaseUrl(builtInProviderId, e.target.value)}
            placeholder={DEFAULT_BASE_URLS[builtInProviderId]}
            className="font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="text-[11px] text-muted-foreground">{t('ai.settingsBaseUrlHint')}</div>
        </section>

        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsCustomProvidersLabel')}
          </Label>
          <div className="text-[11px] text-muted-foreground">{t('ai.settingsCustomProvidersHint')}</div>
          <ul className="flex flex-col gap-1.5">
            {Object.values(customProviders).map(cp => (
              <li
                key={cp.id}
                className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{cp.label}</span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {cp.baseUrl} · {cp.apiFormat} · {cp.models.length} models
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(cp)}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={t('ai.settingsEdit')}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustomProvider(cp.id)}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={t('ai.settingsDelete')}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </li>
            ))}
            {draft ? (
              <li className="rounded border border-dashed border-border px-3 py-2.5 text-xs">
                <div className="flex flex-col gap-1.5">
                  <Input
                    value={draft.label}
                    onChange={e => setDraft({ ...draft, label: e.target.value })}
                    placeholder={t('ai.settingsCustomProviderLabelPlaceholder')}
                    className="text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Input
                    value={draft.baseUrl}
                    onChange={e => setDraft({ ...draft, baseUrl: e.target.value })}
                    placeholder={t('ai.settingsCustomProviderBaseUrlPlaceholder')}
                    className="font-mono text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="flex gap-1 rounded-md bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, apiFormat: 'openai-compat' })}
                      className={cn(
                        'flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors',
                        draft.apiFormat === 'openai-compat'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t('ai.settingsCustomProviderFormatOpenai')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, apiFormat: 'anthropic' })}
                      className={cn(
                        'flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors',
                        draft.apiFormat === 'anthropic'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t('ai.settingsCustomProviderFormatAnthropic')}
                    </button>
                  </div>
                  <Input
                    type="password"
                    value={draft.apiKey}
                    onChange={e => setDraft({ ...draft, apiKey: e.target.value })}
                    placeholder={t('ai.settingsCustomProviderApiKeyPlaceholder')}
                    className="font-mono text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Input
                    value={draft.modelsText}
                    onChange={e => setDraft({ ...draft, modelsText: e.target.value })}
                    placeholder={t('ai.settingsCustomProviderModelsPlaceholder')}
                    className="font-mono text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="mt-1 flex justify-end gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={cancelDraft}>
                      {t('ai.settingsCancel')}
                    </Button>
                    <Button size="sm" className="h-7 cursor-pointer px-3 text-xs" onClick={saveDraft}>
                      {t('ai.settingsSave')}
                    </Button>
                  </div>
                </div>
              </li>
            ) : (
              <li>
                <button
                  type="button"
                  onClick={startNew}
                  className="flex w-full cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Plus className="size-3" />
                  <span>{t('ai.settingsAddProvider')}</span>
                </button>
              </li>
            )}
          </ul>
        </section>

        {builtInProviderId === 'anthropic' && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{t('ai.settingsAnthropicWarning')}</span>
          </div>
        )}

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          ⓘ {t('ai.settingsNetworkHint')}
        </div>
      </div>
    </div>
  );
};
