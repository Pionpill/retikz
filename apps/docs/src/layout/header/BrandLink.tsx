import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/**
 * 顶栏左侧 brand：logo + "retikz" + 版本 badge
 * @description logo 资产到位后替换占位 Sparkles
 */
export const BrandLink: FC = () => {
  const { t } = useTranslation();
  return (
    <Link
      to="/"
      className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
      aria-label="retikz home"
    >
      <span className="text-base font-semibold tracking-tight">ReTikz.doc</span>
      <span className="hidden sm:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
        {t('common.versionTag')}
      </span>
    </Link>
  );
};
