import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePageNavigation } from './usePageNavigation';

const cardClass =
  'flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent hover:text-accent-foreground';

/** 文章末尾的「上一页 / 下一页」大卡片导航，shadcn 风格 */
export const DocPageFooterNav: FC = () => {
  const { t } = useTranslation();
  const { prev, next } = usePageNavigation();

  if (!prev && !next) return null;

  return (
    <nav className="grid grid-cols-2 gap-4">
      {prev ? (
        <Link to={prev.path} className={cn(cardClass, 'items-start text-left')}>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="size-3.5" />
            {t('page.prevPage')}
          </span>
          <span className="font-medium">{t(prev.label)}</span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link to={next.path} className={cn(cardClass, 'items-end text-right')}>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {t('page.nextPage')}
            <ChevronRight className="size-3.5" />
          </span>
          <span className="font-medium">{t(next.label)}</span>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
};
