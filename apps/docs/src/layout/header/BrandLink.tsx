import type { FC } from 'react';
import { Link, useLocation } from 'react-router';

import { resolveModule } from '@/data/module';

/**
 * 顶栏左侧 brand：logo + 模块名 + 版本 badge
 * @description 名称随当前模块切换——core → `retikz.core`、plot → `retikz.plot`，各显示对应包版本；
 *   其余路由（首页 / about）显示 `retikz.doc` 且不带版本徽章。logo 资产到位后替换占位 Sparkles
 */
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
