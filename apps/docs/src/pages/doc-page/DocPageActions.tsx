import { ChatGptIcon, ClaudeIcon, DeepSeekIcon } from '@/components/icons';
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
import { ArrowLeft, ArrowRight, ChevronDown, Copy, FileCode } from 'lucide-react';
import { type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { usePageNavigation } from './usePageNavigation';

const REPO = 'Pionpill/retikz';
const BRANCH = 'main';

export type DocPageActionsProps = {
  /** 当前页面 mdx 源码（用于"复制 markdown"） */
  source: string;
};

/** 把 contents 路径拼好（含 lang），用于 GitHub blob / raw URL */
const buildContentRelativePath = (
  moduleId: string,
  sectionId: string,
  pageId: string,
  subPageId: string | undefined,
  lang: string,
): string => {
  const parts = subPageId ? [moduleId, sectionId, pageId, subPageId] : [moduleId, sectionId, pageId];
  return `apps/docs/src/contents/${parts.join('/')}/${lang}.mdx`;
};

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
  const { moduleId, sectionId, pageId, subPageId } = useParams<'moduleId' | 'sectionId' | 'pageId' | 'subPageId'>();
  const navigate = useNavigate();
  const { prev, next } = usePageNavigation();

  const relPath =
    moduleId && sectionId && pageId ? buildContentRelativePath(moduleId, sectionId, pageId, subPageId, lang) : '';
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
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href={blobUrl} target="_blank" rel="noopener noreferrer">
                  <FileCode />
                  <span>{t('page.viewOnGithub')}</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href={buildAiUrl('https://chatgpt.com/', rawUrl, lang)} target="_blank" rel="noopener noreferrer">
                  <ChatGptIcon />
                  <span>{t('page.openInChatGpt')}</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href={buildAiUrl('https://claude.ai/new', rawUrl, lang)} target="_blank" rel="noopener noreferrer">
                  <ClaudeIcon />
                  <span>{t('page.openInClaude')}</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a
                  href={buildAiUrl('https://chat.deepseek.com/', rawUrl, lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DeepSeekIcon />
                  <span>{t('page.openInDeepSeek')}</span>
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
