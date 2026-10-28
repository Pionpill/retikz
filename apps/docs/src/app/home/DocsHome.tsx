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
      span: { columns: 4, rows: 2 },
      location: ['library', 'layout', 'introduction'],
      preview: {
        files: 'layout-nested',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'bubble-chart',
      span: { columns: 4, rows: 2 },
      location: ['viz', 'chart', 'points', 'bubble'],
      preview: {
        files: 'bubble-basic',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'primitive-model',
      span: { columns: 4, rows: 2 },
      location: ['kernel', 'components', 'core', 'primitive-model'],
      preview: {
        files: 'node-model-layers',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'karl-circle',
      span: { columns: 2, rows: 2 },
      location: ['kernel', 'galleries', 'karl-circle'],
      preview: {
        files: 'karl-circle-06-tan',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'detail-table',
      span: { columns: 4, rows: 2 },
      location: ['viz', 'table', 'detail'],
      preview: {
        files: 'table-layout-playground',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'polar-tracks',
      span: { columns: 4, rows: 2 },
      location: ['viz', 'plot', 'coordinate', 'composition'],
      preview: {
        files: 'coordinate-composition-tracks-polar',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'anchors-explicit',
      span: { columns: 4, rows: 2 },
      location: ['kernel', 'components', 'core', 'primitive-relations'],
      preview: {
        files: 'anchors-explicit',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'tex-formulas',
      span: { columns: 3, rows: 1 },
      location: ['kernel', 'packages', 'tex', 'authoring'],
      preview: {
        files: 'tex-formula-basics',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'regression-marks',
      span: { columns: 4, rows: 2 },
      location: ['viz', 'chart', 'points', 'regression'],
      preview: {
        files: 'regression-marks',
        responsive: true,
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'connected-scatter-marks',
      span: { columns: 4, rows: 2 },
      location: ['viz', 'chart', 'points', 'connected-scatter'],
      preview: {
        files: 'connected-scatter-marks',
        responsive: true,
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'radial-bars',
      span: { columns: 2, rows: 2 },
      location: ['viz', 'plot', 'mark', 'interval'],
      preview: {
        files: 'bar-radial',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'line-curve',
      span: { columns: 3, rows: 2 },
      location: ['viz', 'plot', 'mark', 'path'],
      preview: {
        files: 'line-curve',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'compilation-output',
      span: { columns: 4, rows: 3 },
      location: ['kernel', 'packages', 'core', 'compilation-output'],
      preview: {
        files: 'output-implementation',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
    {
      id: 'coordinate-overview',
      span: { columns: 2, rows: 3 },
      location: ['kernel', 'packages', 'core', 'coordinates'],
      preview: {
        files: 'coordinate-overview',
        size: 'md' as const,
        ...MODULE_LANDING_PREVIEW,
      },
    },
  ];
  const navigation = (
    <>
      <Button asChild variant="default">
        <Link to="/about/introduction">{t('docs.homeAbout')}</Link>
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
      dev
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
