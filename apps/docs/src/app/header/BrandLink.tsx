import type { FC } from 'react';

import { Link } from 'react-router';

/** 顶栏左侧 brand。 */
export const BrandLink: FC = () => (
  <Link
    to="/"
    className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
    aria-label="retikz home"
  >
    <span className="text-base font-semibold tracking-tight">retikz.doc</span>
  </Link>
);
