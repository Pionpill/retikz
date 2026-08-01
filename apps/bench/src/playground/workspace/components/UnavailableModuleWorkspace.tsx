import type { FC } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { BenchModule } from '../constant';

import { defaultBenchModule } from '../constant';

/** 尚未接入执行器的模块工作区属性 */
export type UnavailableModuleWorkspaceProps = Readonly<{
  /** 当前一级路由对应的模块 */
  module: BenchModule;
}>;

/** 展示不可运行模块的稳定占位入口 */
export const UnavailableModuleWorkspace: FC<UnavailableModuleWorkspaceProps> = props => {
  const { module } = props;
  const { t } = useTranslation();
  const Icon = module.icon;
  return (
    <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto bg-background p-6">
      <div className="flex w-full max-w-lg flex-col items-center rounded-2xl border bg-card px-8 py-10 text-center shadow-sm">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Icon className="size-7" />
        </div>
        <Badge variant="secondary">{t('module.soon')}</Badge>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          {t('module.unavailableTitle', { module: t(module.title) })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t(module.description)}</p>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{t('module.unavailableDescription')}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to={defaultBenchModule.path}>
            <ArrowLeft />
            {t('module.backToKernel')}
          </Link>
        </Button>
      </div>
    </main>
  );
};
