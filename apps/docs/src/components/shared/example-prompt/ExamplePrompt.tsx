import { ChevronDown, ChevronUp, Copy, Link2, Quote, Send, Sparkles } from 'lucide-react';
import { type FC, Fragment, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { InlineMarkdown } from '@/components/shared/inline-markdown';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAiChatStore } from '@/store/useAiChatStore';

/** Example 页 Prompt 节 props——主 prompt（短摘要 + 可展开详情）+ 可选「发散思路」扩展列表 */
export type ExamplePromptProps = {
  /** 最小概括（markdown）；默认显示 */
  short: string;
  /** 完整 prompt（markdown）；左下角「展开」按钮点开后替换 short 展示。省略 = 不显示展开按钮 */
  detailed?: string;
  /** 可选「还可以试试这些发散思路」扩展提示词列表（markdown）；每条只有 short 模式，仅可发送到聊天面板（不复制） */
  extensions?: Array<string>;
};

/** 在浏览器里推出 llms.txt 的绝对 URL，用户复制到外部 AI 工具时可直接 fetch */
const getLlmsTxtUrl = (): string => {
  if (typeof window === 'undefined') return '/llms.txt';
  return new URL(`${import.meta.env.BASE_URL}llms.txt`, window.location.origin).toString();
};

/** 当前文档页 URL；SSR 兜底为站点根 */
const getPageUrl = (): string => {
  if (typeof window === 'undefined') return '/';
  return window.location.href;
};

/** 每行前置 `> `，得到 markdown 引用块 */
const toMarkdownQuote = (content: string): string =>
  content
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');

/** 双行菜单项：图标盒 + 标题 + 灰字描述（对齐 DocPageActions 的 MenuItemBody 风格） */
const MenuItemBody: FC<{ icon: ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <>
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">{icon}</span>
    <span className="flex min-w-0 flex-col">
      <span className="text-sm leading-tight">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
    </span>
  </>
);

/** 主 prompt 的动作区：复制（4 档下拉）+ 发送到聊天面板 */
const PromptActions: FC<{ content: string }> = ({ content }) => {
  const { t } = useTranslation();
  const setOpen = useAiChatStore(s => s.setOpen);
  const fillDraftAndFocus = useAiChatStore(s => s.fillDraftAndFocus);

  const writeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('examplePrompt.copiedToast'));
    } catch {
      toast.error(t('examplePrompt.copyFailedToast'));
    }
  };

  const handleCopyPlain = () => void writeClipboard(content);
  const handleCopyWithContext = () =>
    void writeClipboard(
      t('examplePrompt.copyTemplate').replace('{{url}}', getLlmsTxtUrl()).replace('{{content}}', content),
    );
  const handleCopyAsQuote = () => void writeClipboard(toMarkdownQuote(content));
  const handleCopyWithPageLink = () =>
    void writeClipboard(
      t('examplePrompt.pageLinkTemplate').replace('{{url}}', getPageUrl()).replace('{{content}}', content),
    );

  const handleSend = () => {
    setOpen(true);
    fillDraftAndFocus(content);
  };

  return (
    <div className="flex items-center gap-2">
      <ButtonGroup className="flex items-center">
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleCopyPlain}>
          <Copy className="size-3.5" />
          {t('examplePrompt.copy')}
        </Button>
        <ButtonGroupSeparator />
        <DropdownMenu>
          <Button asChild type="button" variant="outline" size="icon" className="h-8 w-7">
            <DropdownMenuTrigger aria-label={t('examplePrompt.copyMoreAriaLabel')}>
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
          </Button>
          <DropdownMenuContent align="end" className="min-w-72">
            <DropdownMenuItem className="cursor-pointer items-center gap-3 py-1.5" onSelect={handleCopyPlain}>
              <MenuItemBody
                icon={<Copy className="size-4" />}
                title={t('examplePrompt.copyPlain')}
                desc={t('examplePrompt.copyPlainDesc')}
              />
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer items-center gap-3 py-1.5" onSelect={handleCopyWithContext}>
              <MenuItemBody
                icon={<Sparkles className="size-4" />}
                title={t('examplePrompt.copyWithContext')}
                desc={t('examplePrompt.copyWithContextDesc')}
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer items-center gap-3 py-1.5" onSelect={handleCopyAsQuote}>
              <MenuItemBody
                icon={<Quote className="size-4" />}
                title={t('examplePrompt.copyAsQuote')}
                desc={t('examplePrompt.copyAsQuoteDesc')}
              />
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer items-center gap-3 py-1.5" onSelect={handleCopyWithPageLink}>
              <MenuItemBody
                icon={<Link2 className="size-4" />}
                title={t('examplePrompt.copyWithPageLink')}
                desc={t('examplePrompt.copyWithPageLinkDesc')}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <Button type="button" size="sm" onClick={handleSend}>
        <Send className="mr-1 size-3.5" />
        {t('examplePrompt.sendToChat')}
      </Button>
    </div>
  );
};

/** 扩展条目：markdown 正文 + 单一 secondary send 按钮（仅发送，不复制） */
const ExtensionRow: FC<{ content: string }> = ({ content }) => {
  const { t } = useTranslation();
  const setOpen = useAiChatStore(s => s.setOpen);
  const fillDraftAndFocus = useAiChatStore(s => s.fillDraftAndFocus);

  const handleSend = () => {
    setOpen(true);
    fillDraftAndFocus(content);
  };

  return (
    <li className="flex items-start justify-between gap-1 px-2">
      <div className="pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="secondary" size="icon" className="h-8 w-8 shrink-0" onClick={handleSend}>
              <Send className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('examplePrompt.sendTooltip')}</TooltipContent>
        </Tooltip>
      </div>
      <InlineMarkdown source={content} className="flex-1 text-foreground/85 text-sm leading-relaxed" />
    </li>
  );
};

/**
 * Example 页的 Prompt 节
 * @description 只读，markdown 渲染。
 *   - 主 prompt：默认显示 `short`；有 `detailed` 时左下角出「展开」按钮，点开后切换为 `detailed`
 *   - 右下角行动：「复制」（4 档下拉：纯文本默认 / 带 retikz 上下文 / Markdown 引用块 / 附页面来源链接）+「发送到 AI 对话」
 *   - 可选 `extensions`：通栏 Separator + 小标题「还可以试试这些发散思路」+ 条目列表；条目间用 Separator 分隔，每条只有 secondary 发送按钮（不支持复制——发散思路用站内 AI 跑就够，不主推外部 AI）
 */
export const ExamplePrompt: FC<ExamplePromptProps> = props => {
  const { short, detailed, extensions } = props;
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);

  const hasDetailed = typeof detailed === 'string' && detailed.length > 0;
  const content = expanded && hasDetailed ? detailed : short;
  const hasExtensions = Array.isArray(extensions) && extensions.length > 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="my-6 rounded-lg border bg-muted/40 px-4 py-3">
        <InlineMarkdown source={content} className="text-foreground/90 text-sm leading-relaxed" />
        <div className="mt-3 flex items-center justify-between gap-2">
          {hasDetailed ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(prev => !prev)}>
              {expanded ? <ChevronUp className="mr-1 size-3.5" /> : <ChevronDown className="mr-1 size-3.5" />}
              {expanded ? t('examplePrompt.collapseDetail') : t('examplePrompt.expandDetail')}
            </Button>
          ) : (
            <span />
          )}
          <PromptActions content={content} />
        </div>

        {hasExtensions && (
          <>
            <Separator className="-mx-4 my-4 w-auto" />
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              {t('examplePrompt.extensionsLabel')}
            </div>
            <ul className="flex flex-col">
              {extensions.map((ext, idx) => (
                <Fragment key={idx}>
                  {idx > 0 && <Separator className="my-1" />}
                  <ExtensionRow content={ext} />
                </Fragment>
              ))}
            </ul>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
