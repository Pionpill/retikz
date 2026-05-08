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
import { ArrowLeft, ArrowRight, ChevronDown, Copy, FileCode, Plug } from 'lucide-react';
import { type FC, type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { docPathSegments, useDocLocation } from './docLocation';
import { usePageNavigation } from './usePageNavigation';

const REPO = 'Pionpill/retikz';
const BRANCH = 'main';

export type DocPageActionsProps = {
  /** 当前页面 mdx 源码（用于"复制 markdown"） */
  source: string;
};

/**
 * 双行菜单项正文：bordered 图标盒（size-8 = 32px，内置 size-5 图标 → 单边 6px 边距）+ 标题 + 灰字描述。
 * 右侧 gap-0：title/desc 各自 line-height 已留有视觉间距，无需额外 gap。
 */
const MenuItemBody: FC<{ icon: ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <>
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">{icon}</span>
    <span className="flex min-w-0 flex-col">
      <span className="text-sm leading-tight">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
    </span>
  </>
);

/** 把 contents 路径拼好（含 lang），用于 GitHub blob / raw URL */
const buildContentRelativePath = (segments: Array<string>, lang: string): string =>
  `apps/docs/src/contents/${segments.join('/')}/${lang}.mdx`;

const buildBlobUrl = (relPath: string) => `https://github.com/${REPO}/blob/${BRANCH}/${relPath}`;
const buildRawUrl = (relPath: string) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${relPath}`;

/** AI 站点的 prompt 直传 URL，按当前界面语言出双语 prompt */
const buildAiUrl = (base: string, rawUrl: string, lang: string): string => {
  const prompt =
    lang === 'zh'
      ? `请阅读这份 retikz 文档并帮我解答相关问题：${rawUrl}`
      : `Please read this retikz documentation and help with related questions: ${rawUrl}`;
  return `${base}?q=${encodeURIComponent(prompt)}`;
};

export const DocPageActions: FC<DocPageActionsProps> = ({ source }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'zh';
  const loc = useDocLocation();
  const navigate = useNavigate();
  const { prev, next } = usePageNavigation();

  const relPath = loc ? buildContentRelativePath(docPathSegments(loc), lang) : '';
  const blobUrl = relPath ? buildBlobUrl(relPath) : '#';
  const rawUrl = relPath ? buildRawUrl(relPath) : '';

  const handleCopyMarkdown = useCallback(() => {
    void navigator.clipboard.writeText(source);
    toast.success(t('page.pageCopied'));
  }, [source, t]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        <ButtonGroup className="flex items-center">
          <Button variant="secondary" size="sm" className="h-8 cursor-pointer gap-1.5" onClick={handleCopyMarkdown}>
            <Copy className="size-3.5" />
            {t('page.copyPage')}
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
                className="size-8 cursor-pointer"
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
                className="size-8 cursor-pointer"
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
