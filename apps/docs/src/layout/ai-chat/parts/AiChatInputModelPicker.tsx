import { ChevronDown, Plus } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { MODEL_CHOICES, PROVIDER_LABEL } from '../models';
import { PROVIDER_IDS } from '../providers/types';

type ProviderGroup = {
  providerId: string;
  label: string;
  models: ReadonlyArray<string>;
  isCustom: boolean;
};

/**
 * AI Chat input 底部 Model picker
 * @description popover 按 provider 分组展示已配置 Key 的模型；未填 Key 的内置 provider
 *   整组隐藏。点列表项跨 provider 切换会同时切 providerId。底部双入口：
 *   "+ 自定义模型名" 行内输入追加到当前 provider 的 customModels；
 *   "+ 添加 Provider" 跳 Settings 视图
 */
export const AiChatInputModelPicker: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const models = useAiChatStore(s => s.models);
  const apiKeys = useAiChatStore(s => s.apiKeys);
  const customProviders = useAiChatStore(s => s.customProviders);
  const customModels = useAiChatStore(s => s.customModels);
  const setProvider = useAiChatStore(s => s.setProvider);
  const setModel = useAiChatStore(s => s.setModel);
  const addCustomModel = useAiChatStore(s => s.addCustomModel);
  const setView = useAiChatStore(s => s.setView);

  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customMode, setCustomMode] = useState(false);

  const groups = useMemo<Array<ProviderGroup>>(() => {
    const builtin: Array<ProviderGroup> = PROVIDER_IDS.filter(id => apiKeys[id].length > 0).map(id => ({
      providerId: id,
      label: PROVIDER_LABEL[id],
      models: [...MODEL_CHOICES[id], ...(customModels[id] ?? [])],
      isCustom: false,
    }));
    const custom: Array<ProviderGroup> = Object.values(customProviders).map(cp => ({
      providerId: cp.id,
      label: cp.label,
      models: [...cp.models, ...(customModels[cp.id] ?? [])],
      isCustom: true,
    }));
    return [...builtin, ...custom];
  }, [apiKeys, customProviders, customModels]);

  const currentModel = models[providerId] ?? '';
  const currentLabel = currentModel || t('ai.convModelLabel');

  const handlePick = (nextProviderId: string, nextModel: string) => {
    if (nextProviderId !== providerId) setProvider(nextProviderId);
    setModel(nextProviderId, nextModel);
    setOpen(false);
  };

  const handleSubmitCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    addCustomModel(providerId, name);
    setModel(providerId, name);
    setCustomInput('');
    setCustomMode(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t('ai.convModelLabel')}
      >
        <span className="font-mono">{currentLabel}</span>
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] max-h-[400px] overflow-y-auto p-0"
      >
        {groups.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t('ai.settingsCustomProvidersHint')}
          </div>
        ) : (
          groups.map((g, gi) => (
            <div key={g.providerId} className={cn(gi > 0 && 'border-t border-border')}>
              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>
                  {g.label}
                  {g.isCustom && (
                    <span className="ml-1 text-[9px] normal-case tracking-normal">·{t('ai.convCustomTag')}</span>
                  )}
                </span>
              </div>
              <ul>
                {g.models.map(m => {
                  const isActive = providerId === g.providerId && currentModel === m;
                  const isCustomModel = (customModels[g.providerId] ?? []).includes(m);
                  return (
                    <li key={m}>
                      <button
                        type="button"
                        onClick={() => handlePick(g.providerId, m)}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-sm font-mono hover:bg-accent hover:text-foreground',
                          isActive && 'bg-accent text-foreground',
                        )}
                      >
                        <span className="truncate">{m}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {isCustomModel && (
                            <span className="text-[10px] font-sans text-muted-foreground">
                              {t('ai.convCustomTag')}
                            </span>
                          )}
                          {isActive && <span className="text-xs">✓</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        <div className="flex items-stretch border-t border-border">
          {customMode ? (
            <div className="flex flex-1 items-center gap-1 px-2 py-1.5">
              <input
                autoFocus
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitCustom();
                  } else if (e.key === 'Escape') {
                    setCustomMode(false);
                    setCustomInput('');
                  }
                }}
                placeholder={t('ai.convAddCustomModel')}
                className="flex-1 rounded border border-border bg-transparent px-2 py-0.5 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleSubmitCustom}
                className="cursor-pointer rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                ↵
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="flex flex-1 cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3" />
              <span>{t('ai.convAddCustomModel')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setView('settings');
            }}
            className="flex flex-1 cursor-pointer items-center gap-2 border-l border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-3" />
            <span>{t('ai.convAddCustomProvider')}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
