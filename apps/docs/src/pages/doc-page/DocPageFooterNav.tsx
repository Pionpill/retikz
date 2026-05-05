import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePageNavigation } from './usePageNavigation';

const cardClass =
  'flex items-center gap-2 rounded-lg bg-muted hover:bg-muted/80 duration-200 transition-colors p-1 px-2 transition-colors hover:bg-accent hover:text-accent-foreground';

/** 文章末尾的「上一页 / 下一页」大卡片导航，shadcn 风格 */
export const DocPageFooterNav: FC = () => {
  const { t } = useTranslation();
  const { prev, next } = usePageNavigation();

  if (!prev && !next) return null;

  return (
    <nav className="flex items-center justify-between">
      {prev ? (
        <Link to={prev.path} className={cardClass}>
          <ArrowLeft className="size-3.5" />
          <span className="font-medium text-sm">{t(prev.label)}</span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link to={next.path} className={cardClass}>
          <span className="font-medium text-sm">{t(next.label)}</span>
          <ArrowRight className="size-3.5" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
};
