import { ChevronRight } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InlineMdx } from '@/components/shared/mdx-content';
import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL, type PackageBlock } from '@/data/changelog.types';

import { ChangelogItems } from './ChangelogItems';
import { ChangelogSubVersions } from './ChangelogSubVersions';

export type ChangelogPackageBlockProps = {
  block: PackageBlock;
  lang: Lang;
};

/** 单个「包 × 中版本」块:包名+版本徽章 + 描述 + highlights + 可展开逐版明细 */
export const ChangelogPackageBlock: FC<ChangelogPackageBlockProps> = ({ block, lang }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = block.subVersions.length;

  return (
    <div className="border-b border-border/60 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-base font-semibold">{PACKAGE_LABEL[block.pkg][lang]}</span>
        <span className="rounded-md border px-1.5 text-xs text-muted-foreground">{block.version}</span>
      </div>
      <InlineMdx source={block.description[lang]} className="mt-1.5 text-muted-foreground" />
      {block.highlights.length ? (
        <div className="mt-3">
          <ChangelogItems items={block.highlights} lang={lang} />
        </div>
      ) : null}
      {count > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="mt-3 flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
            {open ? t('changelog.collapse') : t('changelog.prereleaseCount', { count })}
          </button>
          {open ? <ChangelogSubVersions subVersions={block.subVersions} lang={lang} /> : null}
        </>
      ) : null}
    </div>
  );
};
