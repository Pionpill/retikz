import type { FC } from 'react';

import { Link, useLocation } from 'react-router';

import { resolveModule } from '@/modules/docs/data';

/** 顶栏左侧 brand。 */
export const BrandLink: FC = () => {
  const { pathname } = useLocation();
  const activeModule = resolveModule(pathname);
  const suffix = activeModule?.version ? activeModule.id : 'doc';
  return (
    <Link
      to="/"
      className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
      aria-label="retikz home"
    >
      <span className="text-base font-semibold tracking-tight">retikz.{suffix}</span>
      {activeModule?.version && (
        <span className="hidden @xs/header:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
          {activeModule.version}
        </span>
      )}
    </Link>
  );
};
