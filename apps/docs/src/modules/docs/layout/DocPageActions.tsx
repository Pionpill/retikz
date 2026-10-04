import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Copy, FileCode, Plug } from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ChatGptIcon, ClaudeIcon, DeepSeekIcon, GitHubIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DocDifficultyIndicator } from '@/modules/docs/components';
import type { DocDifficultyValue } from '@/modules/docs/data';
import { buildAiUrl, buildDocPageLinks, computeDocStats } from '@/modules/docs/lib';

import { useDocLocation } from './useDocLocation';
import { usePageNavigation } from './usePageNavigation';

export type DocPageActionsProps = {
  /** 当前页面 mdx 源码（用于"复制 markdown"） */
  source: string;
  /** 当前页面的可选阅读难度。 */
  difficulty?: DocDifficultyValue;
};

/**
 * 双行菜单项正文：图标盒 + 标题 + 灰字描述
 * @description 标题尾随 ↗ 标识外链跳转（紧贴 label，不推到行尾）
 */
const MenuItemBody: FC<{ icon: ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <>
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">{icon}</span>
    <span className="flex min-w-0 flex-col">
      <span className="inline-flex items-center gap-1 text-sm leading-tight">
        {title}
        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
    </span>
  </>
);

export const DocPageActions: FC<DocPageActionsProps> = props => {
  const { difficulty, source } = props;
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'zh';
  const loc = useDocLocation();
  const navigate = useNavigate();
  const { prev, next } = usePageNavigation();

  const links = loc ? buildDocPageLinks(loc, lang) : null;
  const blobUrl = links?.blobUrl ?? '#';
  const rawUrl = links?.rawUrl ?? '';

  const handleCopyMarkdown = useCallback(() => {
    void navigator.clipboard.writeText(source);
    toast.success(t('page.pageCopied'));
  }, [source, t]);

  const stats = useMemo(() => computeDocStats(source, lang, difficulty), [difficulty, lang, source]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        {stats && (
          <span
            title={t('page.docStatsDetails', { chars: stats.referenceChars.toLocaleString() })}
            className="hidden whitespace-nowrap pr-1 text-xs text-muted-foreground md:inline"
          >
            {t('page.docStats', {
              minutes: stats.readingMinutes,
              chars: stats.chars.toLocaleString(),
              examples: stats.examples,
            })}
          </span>
        )}
        <DocDifficultyIndicator difficulty={difficulty} />
        <ButtonGroup className="flex items-center">
          <Button variant="secondary" size="sm" className="h-8 cursor-pointer gap-1.5" onClick={handleCopyMarkdown}>
            <Copy className="size-3.5" />
            <span className="hidden sm:inline">{t('page.copyPage')}</span>
          </Button>
          <ButtonGroupSeparator />
          {/* modal={false}：同 HeaderActions，避免 body[data-scroll-locked] 破坏窗口级 sticky 顶栏（页面下滑时点开会把 header 顶出视口） */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className={buttonVariants({
                variant: 'secondary',
                size: 'icon',
                className: 'h-8 w-7 cursor-pointer',
              })}
              aria-label={t('page.openInGroup')}
            >
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-72">
              <DropdownMenuItem asChild className="cursor-pointer items-center gap-3 py-1.5">
                <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                  <MenuItemBody
                    icon={<FileCode className="size-5" />}
                    title={t('page.viewAsMarkdown')}
                    desc={t('page.viewAsMarkdownDesc')}
                  />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer items-center gap-3 py-1.5">
                <a href={blobUrl} target="_blank" rel="noopener noreferrer">
                  <MenuItemBody
                    icon={<GitHubIcon className="size-5" />}
                    title={t('page.viewOnGithub')}
                    desc={t('page.viewOnGithubDesc')}
                  />
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer items-center gap-3 py-1.5">
                <a href={buildAiUrl('https://chatgpt.com/', rawUrl, lang)} target="_blank" rel="noopener noreferrer">
                  <MenuItemBody
                    icon={<ChatGptIcon className="size-5" />}
                    title={t('page.openInChatGpt')}
                    desc={t('page.openInChatGptDesc')}
                  />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer items-center gap-3 py-1.5">
                <a href={buildAiUrl('https://claude.ai/new', rawUrl, lang)} target="_blank" rel="noopener noreferrer">
                  <MenuItemBody
                    icon={<ClaudeIcon className="size-5" />}
                    title={t('page.openInClaude')}
                    desc={t('page.openInClaudeDesc')}
                  />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer items-center gap-3 py-1.5">
                <a
                  href={buildAiUrl('https://chat.deepseek.com/', rawUrl, lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MenuItemBody
                    icon={<DeepSeekIcon className="size-5" />}
                    title={t('page.openInDeepSeek')}
                    desc={t('page.openInDeepSeekDesc')}
                  />
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer items-center gap-3 py-1.5">
                <a href={`${import.meta.env.BASE_URL}llms.txt`} target="_blank" rel="noopener noreferrer">
                  <MenuItemBody
                    icon={<Plug className="size-5" />}
                    title={t('page.connectMcp')}
                    desc={t('page.connectMcpDesc')}
                  />
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        {prev && (
          <span className="hidden md:inline-flex">
            <Tooltip>
              <TooltipTrigger
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'icon',
                  className: 'size-8 cursor-pointer',
                })}
                onClick={() => navigate(prev.path)}
              >
                <ArrowLeft className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {t('page.prevPage')} · {t(prev.label)}
              </TooltipContent>
            </Tooltip>
          </span>
        )}
        {next && (
          <span className="hidden md:inline-flex">
            <Tooltip>
              <TooltipTrigger
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'icon',
                  className: 'size-8 cursor-pointer',
                })}
                onClick={() => navigate(next.path)}
              >
                <ArrowRight className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {t('page.nextPage')} · {t(next.label)}
              </TooltipContent>
            </Tooltip>
          </span>
        )}
      </div>
    </TooltipProvider>
  );
};
