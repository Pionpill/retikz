import { ArrowUpRight } from 'lucide-react';
import type { FC } from 'react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { buildBlobUrl } from '@/modules/docs/lib';
import type { SourceLinkItem } from '@/modules/docs/source-viewer';
import { useRightPanelStore } from '@/modules/docs/store';

export type { SourceLinkItem } from '@/modules/docs/source-viewer';

/** SourceLinks props */
export type SourceLinksProps = {
  /** 当前机制对应的源码入口 */
  sources: Array<SourceLinkItem>;
};

/** 生成带可选 GitHub 行号锚点的源码链接 */
const sourceHref = (source: SourceLinkItem): string => {
  const href = buildBlobUrl(source.path);
  if (source.startLine === undefined) return href;
  const end = source.endLine === undefined ? '' : `-L${source.endLine}`;
  return `${href}#L${source.startLine}${end}`;
};

/** MDX 文档中的紧凑源码入口列表 */
export const SourceLinks: FC<SourceLinksProps> = props => {
  const { sources } = props;
  const { t } = useTranslation();
  const openSource = useRightPanelStore(state => state.openSource);

  if (sources.length === 0) return null;

  return (
    <nav
      aria-label={t('common.sourceCode')}
      className="my-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 text-xs text-muted-foreground"
    >
      <span className="self-start font-medium text-foreground">{t('common.sourceCodeLabel')}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {sources.map((source, index) => (
          <Fragment key={`${source.path}:${source.startLine ?? ''}:${source.label}`}>
            {index > 0 && (
              <span aria-hidden="true" className="text-border">
                ·
              </span>
            )}
            <button
              type="button"
              data-source-link-open="true"
              onClick={() => openSource(source)}
              className="font-medium underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              {source.label}
            </button>
            <a
              href={sourceHref(source)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('sourceViewer.openOnGithub')}
              className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowUpRight className="size-3" />
            </a>
          </Fragment>
        ))}
      </span>
    </nav>
  );
};
