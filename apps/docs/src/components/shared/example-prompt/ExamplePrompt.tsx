import { ChevronDown, ChevronUp, Copy, Send } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { InlineMarkdown } from '@/components/shared/inline-markdown';
import { useAiChatStore } from '@/store/useAiChatStore';

/** Example 页 Prompt 节 props——短摘要 + 可展开的完整 prompt */
export type ExamplePromptProps = {
  /** 最小概括（markdown）；默认显示 */
  short: string;
  /** 完整 prompt（markdown）；左下角「展开」按钮点开后替换 short 展示。省略 = 不显示展开按钮 */
  detailed?: string;
};

/** 在浏览器里推出 llms.txt 的绝对 URL，用户复制到外部 AI 工具时可直接 fetch */
const getLlmsTxtUrl = (): string => {
  if (typeof window === 'undefined') return '/llms.txt';
  return new URL(`${import.meta.env.BASE_URL}llms.txt`, window.location.origin).toString();
};

/**
 * 把当前 prompt 包装成"可粘贴到任意 AI 工具"的自包含文本
 * @description 前置 retikz 上下文（llms.txt URL + 包用法）让外部 AI 即使没有 retikz 训练知识也能按提示行动；不包含敏感信息，公开站点 URL 即可
 */
const buildPortableCopy = (content: string, template: string): string =>
  template.replace('{{url}}', getLlmsTxtUrl()).replace('{{content}}', content);

/**
 * Example 页的 Prompt 节
 * @description 只读，markdown 渲染。默认显示 `short`；有 `detailed` 时左下角出「展开」按钮，点开后切换为 `detailed`。右下角两个按钮：
 *   - 「复制」：在 prompt 前包一段 retikz 上下文（站点 llms.txt URL + `@retikz/*` 包用法）后写入剪贴板，方便粘贴到任意外部 AI 工具（Claude Code / Cursor / ChatGPT 等）
 *   - 「发送到 AI 对话」：调 useAiChatStore.setOpen + fillDraftAndFocus，把当前显示的内容（不含外部上下文头）推到站内聊天面板由用户自行 send——站内已有 system 注入 retikz 上下文，无需重复
 *   二次编辑请在聊天面板里改，本节本身不编辑
 */
export const ExamplePrompt: FC<ExamplePromptProps> = props => {
  const { short, detailed } = props;
  const { t } = useTranslation();
  const setOpen = useAiChatStore(s => s.setOpen);
  const fillDraftAndFocus = useAiChatStore(s => s.fillDraftAndFocus);

  const [expanded, setExpanded] = useState(false);

  const hasDetailed = typeof detailed === 'string' && detailed.length > 0;
  const content = expanded && hasDetailed ? detailed : short;

  const handleSend = () => {
    setOpen(true);
    fillDraftAndFocus(content);
  };

  const handleCopy = async () => {
    const portable = buildPortableCopy(content, t('examplePrompt.copyTemplate'));
    try {
      await navigator.clipboard.writeText(portable);
      toast.success(t('examplePrompt.copiedToast'));
    } catch {
      toast.error(t('examplePrompt.copyFailedToast'));
    }
  };

  return (
    <div className="my-6 rounded-lg border bg-muted/40 px-4 py-3">
      <InlineMarkdown source={content} className="text-foreground/90 text-sm leading-relaxed" />
      <div className="mt-3 flex items-center justify-between gap-2">
        {hasDetailed ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(prev => !prev)}>
            {expanded ? (
              <ChevronUp className="mr-1 size-3.5" />
            ) : (
              <ChevronDown className="mr-1 size-3.5" />
            )}
            {expanded ? t('examplePrompt.collapseDetail') : t('examplePrompt.expandDetail')}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1 size-3.5" />
            {t('examplePrompt.copy')}
          </Button>
          <Button type="button" size="sm" onClick={handleSend}>
            <Send className="mr-1 size-3.5" />
            {t('examplePrompt.sendToChat')}
          </Button>
        </div>
      </div>
    </div>
  );
};
