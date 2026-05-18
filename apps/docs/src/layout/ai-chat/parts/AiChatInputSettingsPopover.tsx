import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAiChatStore } from '@/store/useAiChatStore';
import { PROVIDER_LABEL } from '../models';
import { isBuiltInProviderId } from '@/store/useAiChatStore';
import type { CustomProvider } from '../providers/resolve';

const LABEL_KEY = {
  lean: 'ai.settingsContextLean',
  balanced: 'ai.settingsContextBalanced',
  heavy: 'ai.settingsContextHeavy',
} as const;

/**
 * Header 右侧 Settings 按钮（SlidersHorizontal icon）+ popover
 * @description 紧凑展示当前配置摘要 + 底部"打开完整 Settings"链接（跳 view='settings'）
 */
export const AiChatInputSettingsPopover: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const model = useAiChatStore(s => s.models[providerId]);
  const apiKeys = useAiChatStore(s => s.apiKeys);
  const baseUrls = useAiChatStore(s => s.baseUrls);
  const customProviders = useAiChatStore(s => s.customProviders);
  const contextMode = useAiChatStore(s => s.contextMode);
  const setView = useAiChatStore(s => s.setView);

  const [open, setOpen] = useState(false);

  const isBuiltIn = isBuiltInProviderId(providerId);
  // customProviders 是 Record<string, CustomProvider>，类型上不含 undefined，
  // 但运行时缺 key 取出来就是 undefined —— 复用 resolveProvider 里的同款 cast
  const customProvider = (customProviders as Record<string, CustomProvider | undefined>)[providerId];
  const providerLabel = isBuiltIn ? PROVIDER_LABEL[providerId] : (customProvider?.label ?? providerId);
  const apiKey = isBuiltIn ? apiKeys[providerId] : (customProvider?.apiKey ?? '');
  const baseUrl = isBuiltIn ? baseUrls[providerId] : (customProvider?.baseUrl ?? '');
  const keyStatus = apiKey.length > 0 ? `${apiKey.slice(0, 4)}••••••` : t('ai.convNotConfigured');
  const baseUrlText = baseUrl.length > 0 ? baseUrl : t('ai.convDefaultEndpoint');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={t('ai.settingsLabel')}
        title={t('ai.settingsLabel')}
      >
        <SlidersHorizontal className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="border-b border-border px-3 py-2 text-xs font-medium">
          {t('ai.convSettingsPopoverTitle')}
        </div>
        <ul className="text-xs">
          <li className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-muted-foreground">{t('ai.settingsProviderLabel')}</span>
            <span className="font-mono">{providerLabel}</span>
          </li>
          <li className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-muted-foreground">{t('ai.convModelLabel')}</span>
            <span className="truncate font-mono">{model || '—'}</span>
          </li>
          <li className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-muted-foreground">{t('ai.convContextModeLabel')}</span>
            <span>{t(LABEL_KEY[contextMode])}</span>
          </li>
          <li className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-muted-foreground">{t('ai.settingsKeyLabel')}</span>
            <span className="font-mono text-muted-foreground">{keyStatus}</span>
          </li>
          <li className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-muted-foreground">{t('ai.settingsBaseUrlLabel')}</span>
            <span className="truncate font-mono text-muted-foreground">{baseUrlText}</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setView('settings');
          }}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowUpRight className="size-3" />
          <span>{t('ai.convOpenFullSettings')}</span>
        </button>
      </PopoverContent>
    </Popover>
  );
};
