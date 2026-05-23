import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { Release } from '@/data/changelog.types';

import { releaseAnchorId } from './anchor';
import { ChangelogPackageBlock } from './ChangelogPackageBlock';

export type ChangelogReleaseProps = {
  release: Release;
  lang: Lang;
};

/** 一个中版本里程碑:锚点 section + 各包块 */
export const ChangelogRelease: FC<ChangelogReleaseProps> = ({ release, lang }) => (
  <section id={releaseAnchorId(release.minor)} className="scroll-mt-24 space-y-6">
    {release.packages.map(block => (
      <ChangelogPackageBlock key={block.pkg} block={block} lang={lang} />
    ))}
  </section>
);
