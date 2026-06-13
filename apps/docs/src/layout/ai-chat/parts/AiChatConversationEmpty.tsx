import { ArrowUpRight, Bot } from 'lucide-react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useAiChatStore } from '@/store/use-ai-chat-store';

const SUGGESTION_KEYS = [
  'ai.convEmptySuggestion1',
  'ai.convEmptySuggestion2',
  'ai.convEmptySuggestion3',
  'ai.convEmptySuggestion4',
] as const;

/**
 * 对话视图空态：messages.length === 0 且无 error 时展示
 * @description Untitled UI 风格：圆形 icon 容器 + 标题 + 一段使用说明（强调直连 LLM、
 *   无后端、Key 留本地）+ "试试这些" + 4 条 suggestion 按钮。点击 suggestion 把文本
 *   写入 store.draft 并请求 input focus
 */
export const AiChatConversationEmpty: FC = () => {
  const { t } = useTranslation();
  const fillDraftAndFocus = useAiChatStore(s => s.fillDraftAndFocus);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted text-foreground">
          <Bot className="size-5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-medium">{t('ai.convEmptyTitle')}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('ai.convEmptyHowItWorks')}</p>
        </div>
      </div>

      <div className="flex w-full max-w-[320px] flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('ai.convEmptySuggestionsLabel')}
        </span>
        <ul className="flex flex-col gap-1.5">
          {SUGGESTION_KEYS.map(key => {
            const text = t(key);
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => fillDraftAndFocus(text)}
                  className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{text}</span>
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
