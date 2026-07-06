import type { FC, ReactNode } from 'react';

import { ChevronDown, ChevronUp, Copy, Link2, Quote, Send, Sparkles } from 'lucide-react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
import { useAiChatStore } from '@/modules/docs/ai-chat';

import { InlineMarkdown } from '../../inline-markdown';

/** Example 页 Prompt 节 props。 */
export type ExamplePromptProps = {
  /** 最小概括。 */
  short: string;
  /** 完整 prompt。 */
  detailed?: string;
  /** 扩展提示词列表。 */
  extensions?: Array<string>;
};

const getLlmsTxtUrl = (): string => {
  if (typeof window === 'undefined') return '/llms.txt';
  return new URL(`${import.meta.env.BASE_URL}llms.txt`, window.location.origin).toString();
};

const getPageUrl = (): string => {
  if (typeof window === 'undefined') return '/';
  return window.location.href;
};

const toMarkdownQuote = (content: string): string =>
  content
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');

const MenuItemBody: FC<{ icon: ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <>
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">{icon}</span>
    <span className="flex min-w-0 flex-col">
      <span className="text-sm leading-tight">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
    </span>
  </>
);

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

/** Example 页的 Prompt 节。 */
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
