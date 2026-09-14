import { ExternalLink, Eye, EyeOff, FileCode, RotateCcw, X } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';
import { HighlightCode } from '@/modules/docs/components/highlight-code';
import { buildBlobUrl, buildRawUrl } from '@/modules/docs/lib';
import { useRightPanelStore } from '@/modules/docs/store';

import type { SourceLinkItem } from './types';

const getSourceLanguage = (path: string): string => {
  const extension = path.split('.').at(-1)?.toLowerCase();
  if (extension === 'ts' || extension === 'tsx' || extension === 'json') return extension;
  if (extension === 'sh' || extension === 'bash') return 'bash';
  return 'text';
};

const sourcePanelIconButtonClassName = cn(
  buttonVariants({ variant: 'ghost', size: 'icon' }),
  'size-7 cursor-pointer rounded-sm',
);

export type SourcePanelProps = {
  /** 当前在右侧查看的源码入口 */
  source: SourceLinkItem;
};

/** 右侧远端源码查看器 */
export const SourcePanel: FC<SourcePanelProps> = props => {
  const { source } = props;
  const { t } = useTranslation();
  const close = useRightPanelStore(state => state.close);
  const [code, setCode] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [showLineHighlight, setShowLineHighlight] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const sourceContentRef = useRef<HTMLDivElement>(null);
  const rawUrl = buildRawUrl(source.path);
  const blobUrl = buildBlobUrl(source.path);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void fetch(rawUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) return Promise.reject();
        return response.text();
      })
      .then(nextCode => {
        if (active) setCode(nextCode);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [rawUrl, retryNonce]);

  useEffect(() => {
    if (code === undefined || source.startLine === undefined) return;
    sourceContentRef.current
      ?.querySelector<HTMLElement>(`[data-source-line="${source.startLine}"]`)
      ?.scrollIntoView({ block: 'center' });
  }, [code, source.startLine]);

  return (
    <aside className="flex h-full min-w-0 flex-col" data-source-panel>
      <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <FileCode className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{source.label}</span>
          <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{source.path}</span>
        </div>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger
              className={sourcePanelIconButtonClassName}
              data-source-line-highlight-toggle
              onClick={() => setShowLineHighlight(value => !value)}
              aria-label={t(showLineHighlight ? 'sourceViewer.hideLineHighlight' : 'sourceViewer.showLineHighlight')}
            >
              {showLineHighlight ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </TooltipTrigger>
            <TooltipContent>
              {t(showLineHighlight ? 'sourceViewer.hideLineHighlight' : 'sourceViewer.showLineHighlight')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('sourceViewer.openOnGithub')}
                className={sourcePanelIconButtonClassName}
              >
                <ExternalLink className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t('sourceViewer.openOnGithub')}</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer rounded-sm"
            onClick={close}
            aria-label={t('sourceViewer.close')}
          >
            <X className="size-4" />
          </Button>
        </TooltipProvider>
      </header>
      <div ref={sourceContentRef} className="min-h-0 flex-1 overflow-auto bg-background [&_.shiki]:!p-0">
        {code === undefined && !failed ? (
          <p className="p-4 text-sm text-muted-foreground">{t('sourceViewer.loading')}</p>
        ) : null}
        {failed ? (
          <div className="flex flex-col items-start gap-3 p-4 text-sm text-muted-foreground">
            <p>{t('sourceViewer.loadFailed')}</p>
            <Button
              variant="secondary"
              size="sm"
              className="cursor-pointer gap-1.5"
              data-source-retry
              onClick={() => {
                setFailed(false);
                setRetryNonce(value => value + 1);
              }}
            >
              <RotateCcw className="size-3.5" />
              {t('sourceViewer.retry')}
            </Button>
          </div>
        ) : null}
        {code !== undefined ? (
          <HighlightCode
            lang={getSourceLanguage(source.path)}
            code={code}
            showLineNumbers
            lineNumberStart={1}
            activeLineRange={
              !showLineHighlight || source.startLine === undefined
                ? undefined
                : { start: source.startLine, end: source.endLine ?? source.startLine }
            }
          />
        ) : null}
      </div>
    </aside>
  );
};
