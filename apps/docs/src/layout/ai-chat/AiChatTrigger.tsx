import { BotMessageSquare } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Shortcut } from '@/components/shared/shortcut';
import { buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';

/**
 * AI 聊天 Sheet 的 Header 触发器
 * @description 渲染：icon 按钮 + tooltip 显示快捷键。
 *   行为：点击切换 Sheet 开关；监听 Cmd/Ctrl+I 也触发；与 DocsSearch (Cmd+K) 形成对称
 */
export const AiChatTrigger: FC = () => {
  const { t } = useTranslation();
  const toggleOpen = useAiChatStore(s => s.toggleOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'i') {
        // Cmd+I 在 Safari 等浏览器是「显示页面信息」，需要 preventDefault
        e.preventDefault();
        toggleOpen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleOpen]);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          onClick={toggleOpen}
          aria-label={t('ai.triggerLabel')}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'hidden cursor-pointer text-muted-foreground hover:text-accent-foreground lg:inline-flex',
          )}
        >
          <BotMessageSquare className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          {t('ai.triggerHint')}
          <Shortcut keys={['mod', 'I']} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
