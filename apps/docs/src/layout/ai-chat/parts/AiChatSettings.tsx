import { AlertTriangle, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import type { ContextMode } from '../context';
import { MODEL_CHOICES, PROVIDER_LABEL } from '../models';
import type { ProviderId } from '../providers/types';
import { PROVIDER_IDS } from '../providers/types';

const CONTEXT_MODES: ReadonlyArray<ContextMode> = ['lean', 'balanced', 'heavy'];

const CONTEXT_LABEL_KEY = {
  lean: 'ai.settingsContextLean',
  balanced: 'ai.settingsContextBalanced',
  heavy: 'ai.settingsContextHeavy',
} as const;

const CONTEXT_DESC_KEY = {
  lean: 'ai.settingsContextDescLean',
  balanced: 'ai.settingsContextDescBalanced',
  heavy: 'ai.settingsContextDescHeavy',
} as const;

const KEY_HELP_URL: Record<ProviderId, string> = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
};

export const AiChatSettings: FC = () => {
  const { t } = useTranslation();
  const providerId = useAiChatStore(s => s.providerId);
  const setProvider = useAiChatStore(s => s.setProvider);
  const apiKey = useAiChatStore(s => s.apiKeys[providerId]);
  const setApiKey = useAiChatStore(s => s.setApiKey);
  const model = useAiChatStore(s => s.models[providerId]);
  const setModel = useAiChatStore(s => s.setModel);
  const contextMode = useAiChatStore(s => s.contextMode);
  const setContextMode = useAiChatStore(s => s.setContextMode);
  const setView = useAiChatStore(s => s.setView);

  const [showKey, setShowKey] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
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

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* Provider segmented */}
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
                  providerId === id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {PROVIDER_LABEL[id]}
              </button>
            ))}
          </div>
        </section>

        {/* API Key */}
        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsKeyLabel')}
          </Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(providerId, e.target.value)}
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
              href={KEY_HELP_URL[providerId]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {t('ai.settingsHowToGet')}
            </a>
          </div>
        </section>

        {/* Model */}
        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsModelLabel')}
          </Label>
          <Input
            value={model}
            onChange={e => setModel(providerId, e.target.value)}
            list={`ai-model-options-${providerId}`}
            className="font-mono text-xs"
            spellCheck={false}
          />
          <datalist id={`ai-model-options-${providerId}`}>
            {MODEL_CHOICES[providerId].map(m => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <div className="text-[11px] text-muted-foreground">{t('ai.settingsModelCustom')}</div>
        </section>

        {/* Context mode */}
        <section className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.settingsContextLabel')}
          </Label>
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {CONTEXT_MODES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setContextMode(m)}
                className={cn(
                  'flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors',
                  contextMode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(CONTEXT_LABEL_KEY[m])}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground">{t(CONTEXT_DESC_KEY[contextMode])}</div>
        </section>

        {/* Anthropic warning */}
        {providerId === 'anthropic' && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{t('ai.settingsAnthropicWarning')}</span>
          </div>
        )}

        {/* Network hint */}
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          ⓘ {t('ai.settingsNetworkHint')}
        </div>
      </div>
    </div>
  );
};
