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
import { buildAiUrl, buildDocPageLinks } from '@/lib/doc-links';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Copy, FileCode, Plug } from 'lucide-react';
import { type FC, type ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useDocLocation } from './doc-location';
import { usePageNavigation } from './use-page-navigation';

export type DocPageActionsProps = {
  /** 当前页面 mdx 源码（用于"复制 markdown"） */
  source: string;
};

type DocStats = {
  /** 去除标记后的正文字符数 */
  chars: number;
  /** 正文中可交互 / 可视化组件数量 */
  components: number;
  /** 估算完整阅读分钟数 */
  readingMinutes: number;
};

/** 移动端紧凑统计：>=1000 转 K，其它原值；用于 page.docStatsCompact 的字数槽位 */
const formatCompactCount = (count: number): string => {
  if (count >= 10000) return `${Math.round(count / 1000)}K`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

/** 中文技术文档估算阅读速度：每分钟字符数 */
const ZH_CHARS_PER_MINUTE = 500;
/** 英文技术文档估算阅读速度：每分钟字符数 */
const EN_CHARS_PER_MINUTE = 900;
/** 未知语言估算阅读速度：每分钟字符数 */
const FALLBACK_CHARS_PER_MINUTE = 650;
/** 每个文档组件额外估算阅读时间 */
const COMPONENT_READING_MINUTES = 0.5;

const getCharsPerMinute = (lang: string): number => {
  if (lang.startsWith('zh')) return ZH_CHARS_PER_MINUTE;
  if (lang.startsWith('en')) return EN_CHARS_PER_MINUTE;
  return FALLBACK_CHARS_PER_MINUTE;
};

/**
 * 估算文档统计
 * @description chars 剥掉 frontmatter / 代码块 / md 标记后的非空白字符数；components 计大写开头 JSX 开标签数量（先剥代码块避免 ``` 里的伪组件计入）
 */
const computeDocStats = (mdx: string, lang: string): DocStats => {
  let s = mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  s = s.replace(/```[\s\S]*?```/g, '');
  s = s.replace(/`[^`\n]*`/g, '');
  const components = s.match(/<[A-Z][A-Za-z0-9_]*\b/g)?.length ?? 0;
  s = s.replace(/<\/?[A-Za-z][^>]*>/g, '');
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/[#*_~>`-]/g, '');
  const chars = s.replace(/\s/g, '').length;
  const readingMinutes = Math.max(
    1,
    Math.ceil(chars / getCharsPerMinute(lang) + components * COMPONENT_READING_MINUTES),
  );
  return { chars, components, readingMinutes };
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
  const { source } = props;
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

  const stats = useMemo(() => computeDocStats(source, lang), [lang, source]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        <span className="hidden whitespace-nowrap pr-1 text-xs text-muted-foreground sm:inline">
          {t('page.docStats', {
            minutes: stats.readingMinutes,
            chars: stats.chars.toLocaleString(),
            components: stats.components,
          })}
        </span>
        <span className="whitespace-nowrap pr-1 text-[11px] text-muted-foreground sm:hidden">
          {t('page.docStatsCompact', {
            minutes: stats.readingMinutes,
            chars: formatCompactCount(stats.chars),
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
