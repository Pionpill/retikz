import { Send } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAiChatStore } from '@/store/useAiChatStore';

/** Example 页 Prompt 节 props——只读展示一段自然语言 prompt，配右下角发送按钮 */
export type ExamplePromptProps = {
  /** Prompt 内容；自然语言描述图（保留换行 / 分类 bullet 等格式） */
  prompt: string;
};

/**
 * Example 页的 Prompt 节
 * @description 只读：上方展示 prompt 全文（保留换行），右下角「发送到 AI 对话」按钮调 useAiChatStore.setOpen + fillDraftAndFocus，把 prompt 推到聊天面板的输入区由用户自行 send。读者要二次编辑就在聊天面板里改，本节本身不做编辑
 */
export const ExamplePrompt: FC<ExamplePromptProps> = props => {
  const { prompt } = props;
  const { t } = useTranslation();
  const setOpen = useAiChatStore(s => s.setOpen);
  const fillDraftAndFocus = useAiChatStore(s => s.fillDraftAndFocus);

  const handleSend = () => {
    setOpen(true);
    fillDraftAndFocus(prompt);
  };

  return (
    <div className="my-6 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
        {prompt}
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" onClick={handleSend}>
          <Send className="mr-1 size-3.5" />
          {t('examplePrompt.sendToChat')}
        </Button>
      </div>
    </div>
  );
};
