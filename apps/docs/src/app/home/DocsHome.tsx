import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { modules } from '@/modules/docs/data';

/** Docs 首页：提供真实模块与 About 的全局入口。 */
export const DocsHome: FC = () => {
  const { t } = useTranslation();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t('docs.homeTitle')}</h1>
      <nav aria-label={t('docs.moduleNavigationLabel')}>
        <ul className="flex flex-wrap justify-center gap-3">
          {modules.map(module => (
            <li key={module.id}>
              <Link className="text-sm text-muted-foreground hover:text-foreground" to={`/${module.id}`}>
                {t(module.navigationLabel)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link className="text-sm text-muted-foreground hover:text-foreground" to="/about/overview">
        {t('docs.homeAbout')}
      </Link>
    </main>
  );
};
