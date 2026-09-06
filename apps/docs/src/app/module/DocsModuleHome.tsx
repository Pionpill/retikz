import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import type { DocModuleId } from '@/modules/docs/data';

import { modules } from '@/modules/docs/data';

export type DocsModuleHomeProps = {
  /** 当前模块标识。 */
  moduleId: DocModuleId;
};

/** 模块主页：只提供稳定的空白占位入口。 */
export const DocsModuleHome: FC<DocsModuleHomeProps> = props => {
  const { moduleId } = props;
  const { t } = useTranslation();
  const moduleEntry = modules.find(module => module.id === moduleId);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{moduleEntry ? t(moduleEntry.label) : moduleId}</h1>
      <p className="text-sm text-muted-foreground">{t('docs.moduleHomePlaceholder')}</p>
    </main>
  );
};
