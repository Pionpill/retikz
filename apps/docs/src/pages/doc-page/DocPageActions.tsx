import { ChatGptIcon, ClaudeIcon, DeepSeekIcon, GitHubIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildAiUrl, buildDocPageLinks } from '@/lib/docLinks';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Copy, FileCode, Plug } from 'lucide-react';
import { type FC, type ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useDocLocation } from './docLocation';
import { usePageNavigation } from './usePageNavigation';

export type DocPageActionsProps = {
  /** 当前页面 mdx 源码（用于"复制 markdown"） */
  source: string;
};

/**
 * 估算文档统计
 * @description chars 剥掉 frontmatter / 代码块 / md 标记后的非空白字符数；components 计大写开头 JSX 开标签数量（先剥代码块避免 ``` 里的伪组件计入）
 */
const computeDocStats = (mdx: string): { chars: number; components: number } => {
  let s = mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  s = s.replace(/```[\s\S]*?```/g, '');
  s = s.replace(/`[^`\n]*`/g, '');
  const components = s.match(/<[A-Z][A-Za-z0-9_]*\b/g)?.length ?? 0;
  s = s.replace(/<\/?[A-Za-z][^>]*>/g, '');
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/[#*_~>`-]/g, '');
  const chars = s.replace(/\s/g, '').length;
  return { chars, components };
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

export const DocPageActions: FC<DocPageActionsProps> = ({ source }) => {
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

  const stats = useMemo(() => computeDocStats(source), [source]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        <span className="hidden whitespace-nowrap pr-1 text-xs text-muted-foreground sm:inline">
          {t('page.docStats', {
            chars: stats.chars.toLocaleString(),
            components: stats.components,
          })}
        </span>
        <ButtonGroup className="flex items-center">
          <Button variant="secondary" size="sm" className="h-8 cursor-pointer gap-1.5" onClick={handleCopyMarkdown}>
            <Copy className="size-3.5" />
            <span className="hidden sm:inline">{t('page.copyPage')}</span>
          </Button>
          <ButtonGroupSeparator />
          <DropdownMenu>
            <Button asChild variant="secondary" size="icon" className="h-8 w-7 cursor-pointer">
              <DropdownMenuTrigger aria-label={t('page.openInGroup')}>
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
            </Button>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 cursor-pointer hidden sm:inline-flex"
                onClick={() => navigate(prev.path)}
              >
                <ArrowLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('page.prevPage')} · {t(prev.label)}
            </TooltipContent>
          </Tooltip>
        )}
        {next && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 cursor-pointer hidden sm:inline-flex"
                onClick={() => navigate(next.path)}
              >
                <ArrowRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('page.nextPage')} · {t(next.label)}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
