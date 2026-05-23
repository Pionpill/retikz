import type { FC } from 'react';

import { InlineMdx } from '@/components/shared/mdx-content';
import type { Lang } from '@/i18n';
import type { SubVersion } from '@/data/changelog.types';

import { ChangelogItems } from './ChangelogItems';

export type ChangelogSubVersionsProps = {
  subVersions: Array<SubVersion>;
  lang: Lang;
};

/** 展开后的逐预发布明细:版本号(mono)+ 日期 + 可选 summary + items */
export const ChangelogSubVersions: FC<ChangelogSubVersionsProps> = ({ subVersions, lang }) => (
  <div className="mt-3 space-y-4 border-l-2 border-border pl-4">
    {subVersions.map(sub => (
      <div key={sub.version}>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-mono font-medium">{sub.version}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{sub.date}</span>
        </div>
        {sub.summary ? <InlineMdx source={sub.summary[lang]} className="mt-1 text-sm text-muted-foreground" /> : null}
        {sub.items.length ? (
          <div className="mt-1.5 text-sm">
            <ChangelogItems items={sub.items} lang={lang} />
          </div>
        ) : null}
      </div>
    ))}
  </div>
);
