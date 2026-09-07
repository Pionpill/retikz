import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { ModuleLandingDemo } from '@/modules/docs/components';
import type { DocModuleId, I18nKey } from '@/modules/docs/data';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import { MODULE_LANDING_PREVIEW, ModuleLandingPage } from '@/modules/docs/components';
import { modules } from '@/modules/docs/data';

type ModuleHomeConfiguration = {
  /** 模块首页的定位标题。 */
  title: I18nKey;
  /** 模块首页的简短定位文案。 */
  description: I18nKey;
  /** 模块的代表性演示。 */
  demos: ReadonlyArray<ModuleLandingDemo>;
};

const MODULE_HOME_CONFIGURATIONS: Record<DocModuleId, ModuleHomeConfiguration> = {
  kernel: {
    title: 'kernel.homeTitle',
    description: 'kernel.homeDescription',
    demos: [
      {
        id: 'architecture',
        layout: 'feature',
        location: ['kernel', 'components', 'design', 'principles'],
        preview: { files: 'principles-packages', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'primitive-model',
        layout: 'compact',
        location: ['kernel', 'components', 'core', 'primitive-model'],
        preview: { files: 'node-model-layers', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'coordinate-system',
        layout: 'compact',
        location: ['kernel', 'components', 'basic', 'coordinate-system'],
        preview: { files: 'coordinate-system', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'karl-circle',
        layout: 'compact',
        location: ['kernel', 'galleries', 'karl-circle'],
        preview: { files: 'karl-circle-06-tan', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'layout',
        layout: 'compact',
        location: ['kernel', 'components', 'layout', 'overview'],
        preview: { files: 'layout-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
  library: {
    title: 'library.homeTitle',
    description: 'library.homeDescription',
    demos: [
      {
        id: 'nested-layout',
        layout: 'feature',
        location: ['library', 'layout'],
        preview: { files: 'layout-nested', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'standard-grid',
        layout: 'compact',
        location: ['library', 'standard', 'composite', 'grid'],
        preview: { files: 'grid-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'flex-layout',
        layout: 'compact',
        location: ['library', 'layout', 'flex-layout'],
        preview: { files: 'flex-layout-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'overlay-layout',
        layout: 'compact',
        location: ['library', 'layout', 'overlay-layout'],
        preview: { files: 'overlay-layout-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'surface',
        layout: 'compact',
        location: ['library', 'standard', 'composite', 'surface'],
        preview: { files: 'surface-overflow', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
  schematic: {
    title: 'schematic.homeTitle',
    description: 'schematic.homeDescription',
    demos: [
      {
        id: 'entity',
        layout: 'feature',
        location: ['schematic', 'graph', 'entity', 'basic'],
        preview: { files: 'entity-activity', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'relation',
        layout: 'compact',
        location: ['schematic', 'graph', 'relation', 'basic'],
        preview: { files: 'relation-flow', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'block',
        layout: 'compact',
        location: ['schematic', 'graph', 'block', 'basic'],
        preview: { files: 'block-connection', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'group',
        layout: 'compact',
        location: ['schematic', 'graph', 'group'],
        preview: { files: 'group-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'flow',
        layout: 'compact',
        location: ['schematic', 'diagram', 'flow', 'basic'],
        preview: { files: 'flow-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
  viz: {
    title: 'viz.homeTitle',
    description: 'viz.homeDescription',
    demos: [
      {
        id: 'bubble-chart',
        layout: 'feature',
        location: ['viz', 'chart', 'points', 'bubble'],
        preview: { files: 'bubble-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'detail-table',
        layout: 'compact',
        location: ['viz', 'table', 'detail'],
        preview: { files: 'table-layout-playground', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'polar-tracks',
        layout: 'compact',
        location: ['viz', 'plot', 'coordinate', 'composition'],
        preview: { files: 'coordinate-composition-tracks-polar', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'cartesian-coordinate',
        layout: 'compact',
        location: ['viz', 'plot', 'coordinate', '2d'],
        preview: { files: 'coordinate-cartesian', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'relation-mark',
        layout: 'compact',
        location: ['viz', 'plot', 'mark', 'relation'],
        preview: { files: 'relation-bubble', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
};

export type DocsModuleHomeProps = {
  /** 当前模块标识。 */
  moduleId: DocModuleId;
};

/** 模块主页：展示该模块的定位、核心入口与代表性能力。 */
export const DocsModuleHome: FC<DocsModuleHomeProps> = props => {
  const { moduleId } = props;
  const { t } = useTranslation();
  const configuration = MODULE_HOME_CONFIGURATIONS[moduleId];
  const quickLinks = modules.find(module => module.id === moduleId)?.quickLinks ?? [];
  const primaryAction = quickLinks.find(link => link.primary);
  const actions = quickLinks.filter(link => !link.primary);
  const navigation = (
    <>
      {primaryAction ? (
        <Button asChild variant="default">
          <Link to={primaryAction.path}>{t(primaryAction.label)}</Link>
        </Button>
      ) : null}
      <ButtonGroup>
        {actions.map((action, index) => (
          <Button
            key={action.path}
            asChild
            variant="outline"
            className={cn(index > 0 && 'rounded-l-none border-l-0', index < actions.length - 1 && 'rounded-r-none')}
          >
            <Link to={action.path}>{t(action.label)}</Link>
          </Button>
        ))}
      </ButtonGroup>
    </>
  );

  return (
    <ModuleLandingPage
      title={t(configuration.title)}
      description={t(configuration.description)}
      dev
      navigationLabel={t('docs.moduleNavigationLabel')}
      navigation={navigation}
      demos={configuration.demos}
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
