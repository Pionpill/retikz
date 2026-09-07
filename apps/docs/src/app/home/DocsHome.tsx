import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MODULE_LANDING_PREVIEW, ModuleLandingPage } from '@/modules/docs/components';
import { modules } from '@/modules/docs/data';

/** Docs 首页：提供真实模块与 About 的全局入口。 */
export const DocsHome: FC = () => {
  const { t } = useTranslation();

  const demos = [
    {
      id: 'layout',
      layout: 'compact' as const,
      location: ['library', 'layout'],
      preview: {
        files: 'layout-nested',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'bubble-chart',
      layout: 'compact' as const,
      location: ['viz', 'chart', 'points', 'bubble'],
      preview: {
        files: 'bubble-basic',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'primitive-model',
      layout: 'compact' as const,
      location: ['kernel', 'concepts', 'core', 'primitive-model'],
      preview: {
        files: 'node-model-layers',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'karl-circle',
      layout: 'compact' as const,
      location: ['kernel', 'examples', 'karl-circle'],
      preview: {
        files: 'karl-circle-06-tan',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'detail-table',
      layout: 'compact' as const,
      location: ['viz', 'table', 'detail'],
      preview: {
        files: 'table-layout-playground',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'polar-tracks',
      layout: 'compact' as const,
      location: ['viz', 'plot', 'coordinate', 'composition'],
      preview: {
        files: 'coordinate-composition-tracks-polar',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
  ];
  const navigation = (
    <>
      <Button asChild variant="default">
        <Link to="/about/overview">{t('docs.homeAbout')}</Link>
      </Button>
      <TooltipProvider delayDuration={150}>
        <ButtonGroup>
          {modules.map((module, index) => (
            <Tooltip key={module.id}>
              <TooltipTrigger asChild>
                <span className="flex">
                  <Button
                    asChild
                    variant="outline"
                    className={cn(
                      index > 0 && 'rounded-l-none border-l-0',
                      index < modules.length - 1 && 'rounded-r-none',
                    )}
                  >
                    <Link to={`/${module.id}`}>{t(module.navigationLabel)}</Link>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t(module.navigationDescription)}</TooltipContent>
            </Tooltip>
          ))}
        </ButtonGroup>
      </TooltipProvider>
    </>
  );

  return (
    <ModuleLandingPage
      title={t('docs.homeTitle')}
      description={t('docs.homeDescription')}
      navigationLabel={t('docs.moduleNavigationLabel')}
      navigation={navigation}
      demos={demos}
      footer={
        <>
          {t('docs.homeFooterBuiltBy')}{' '}
          <a className="text-foreground underline underline-offset-4" href="https://github.com/Pionpill">
            Pionpill
          </a>
          {t('docs.homeFooterSourcePrefix')}{' '}
          <a className="text-foreground underline underline-offset-4" href="https://github.com/Pionpill/retikz">
            GitHub
          </a>
          {t('docs.homeFooterSourceSuffix')}
        </>
      }
    />
  );
};
