import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatGptIcon, ClaudeIcon, DeepSeekIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { buildAiUrl } from '@/lib/doc-links';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/use-ai-chat-store';

const DEEPLINK_BASES = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/new',
  deepseek: 'https://chat.deepseek.com/',
} as const;

export const AiChatEmpty: FC = () => {
  const { t, i18n } = useTranslation();
  const setView = useAiChatStore(s => s.setView);
  const currentPage = useAiChatStore(s => s.currentPage);
  const lang = i18n.resolvedLanguage ?? 'zh';

  const rawUrl = currentPage?.rawUrl ?? '';
  const hasDeeplinks = rawUrl.length > 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-6">
      <div className="flex flex-1 flex-col justify-center gap-5">
        <div className="text-center">
          <div className="mx-auto mb-2 text-3xl">✦</div>
          <div className="text-base font-medium">{t('ai.emptyTitle')}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t('ai.emptySubtitle')}</p>
        </div>

        <section className="flex flex-col gap-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('ai.emptyByokLabel')}
          </div>
          <Button size="lg" className="cursor-pointer" onClick={() => setView('settings')}>
            {t('ai.emptyFillKey')}
          </Button>
          <div className="text-[11px] text-muted-foreground">{t('ai.emptyByokDesc')}</div>
        </section>

        {hasDeeplinks && (
          <>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{t('ai.emptyOr')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <section className="flex flex-col gap-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('ai.emptyDeeplinkLabel')}
              </div>
              <div className="flex gap-2">
                <DeeplinkButton
                  href={buildAiUrl(DEEPLINK_BASES.chatgpt, rawUrl, lang)}
                  icon={<ChatGptIcon className="size-4" />}
                  label={t('page.openInChatGpt')}
                />
                <DeeplinkButton
                  href={buildAiUrl(DEEPLINK_BASES.claude, rawUrl, lang)}
                  icon={<ClaudeIcon className="size-4" />}
                  label={t('page.openInClaude')}
                />
                <DeeplinkButton
                  href={buildAiUrl(DEEPLINK_BASES.deepseek, rawUrl, lang)}
                  icon={<DeepSeekIcon className="size-4" />}
                  label={t('page.openInDeepSeek')}
                />
              </div>
            </section>
          </>
        )}
      </div>

      <div className="mt-5 text-center text-[10px] text-muted-foreground">{t('ai.emptyNetworkHint')}</div>
    </div>
  );
};

const DeeplinkButton: FC<{ href: string; icon: React.ReactNode; label: string }> = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      'flex flex-1 flex-col items-center gap-1 rounded-md border border-input bg-background px-2 py-2 text-[11px] transition-colors hover:bg-accent hover:text-accent-foreground',
    )}
  >
    {icon}
    <span className="text-center leading-tight">{label}</span>
  </a>
);
