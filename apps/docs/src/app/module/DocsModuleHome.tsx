import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import type { ModuleLandingDemo } from '@/modules/docs/components';
import { MODULE_LANDING_PREVIEW, ModuleLandingPage } from '@/modules/docs/components';
import type { DocModuleId, I18nKey } from '@/modules/docs/data';
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
        span: { columns: 4, rows: 2 },
        location: ['kernel', 'components', 'design', 'principles'],
        preview: { files: 'principles-packages', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'primitive-model',
        span: { columns: 3, rows: 2 },
        location: ['kernel', 'components', 'core', 'primitive-model'],
        preview: { files: 'node-model-layers', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'coordinate-system',
        span: { columns: 4, rows: 2 },
        location: ['kernel', 'components', 'basic', 'coordinate-system'],
        preview: {
          files: '/kernel/components/scope/mechanism/scope-transform-steps',
          size: 'md',
          ...MODULE_LANDING_PREVIEW,
        },
      },
      {
        id: 'layout',
        span: { columns: 5, rows: 3 },
        location: ['kernel', 'components', 'layout', 'overview'],
        preview: {
          files: '/kernel/components/node/mechanism/namespace-storage',
          size: 'md',
          ...MODULE_LANDING_PREVIEW,
        },
      },
      {
        id: 'path-label-interval',
        span: { columns: 4, rows: 2 },
        location: ['kernel', 'components', 'path', 'mechanism'],
        preview: { files: 'path-label-interval', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'anchors-explicit',
        span: { columns: 4, rows: 2 },
        location: ['kernel', 'components', 'core', 'primitive-relations'],
        preview: { files: 'anchors-explicit', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'relation-dynamic-vs-locked',
        span: { columns: 3, rows: 1 },
        location: ['kernel', 'components', 'core', 'primitive-relations'],
        preview: { files: 'relation-dynamic-vs-locked', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'layout-theme-overlays',
        span: { columns: 4, rows: 2 },
        location: ['kernel', 'components', 'layout', 'mechanism'],
        preview: { files: 'layout-theme-overlays', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'node-size-states',
        span: { columns: 3, rows: 1 },
        location: ['kernel', 'components', 'node', 'mechanism'],
        preview: { files: 'node-size-states', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'math-bounds',
        span: { columns: 1, rows: 1 },
        location: ['kernel', 'packages', 'math', 'primitives'],
        preview: { files: 'bounds-playground', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'math-curve',
        span: { columns: 2, rows: 1 },
        location: ['kernel', 'packages', 'math', 'algorithms'],
        preview: { files: 'curve-playground', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'tex-formulas',
        span: { columns: 3, rows: 1 },
        location: ['kernel', 'packages', 'tex', 'authoring'],
        preview: { files: 'tex-formula-basics', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'inspect-node-geometry',
        span: { columns: 1, rows: 1 },
        location: ['kernel', 'packages', 'inspect', 'builtins'],
        preview: { files: 'inspect-node-geometry', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
  library: {
    title: 'library.homeTitle',
    description: 'library.homeDescription',
    demos: [
      {
        id: 'nested-layout',
        span: { columns: 4, rows: 2 },
        location: ['library', 'layout'],
        preview: { files: 'layout-nested', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'standard-grid',
        span: { columns: 2, rows: 2 },
        location: ['library', 'standard', 'grid'],
        preview: { files: 'grid-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'flex-layout',
        span: { columns: 2, rows: 2 },
        location: ['library', 'layout', 'flex-layout'],
        preview: { files: 'flex-layout-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'overlay-layout',
        span: { columns: 2, rows: 2 },
        location: ['library', 'layout', 'overlay-layout'],
        preview: { files: 'overlay-layout-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'surface',
        span: { columns: 2, rows: 2 },
        location: ['library', 'standard', 'surface'],
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
        span: { columns: 4, rows: 2 },
        location: ['schematic', 'graph', 'entity', 'basic'],
        preview: { files: 'entity-activity', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'relation',
        span: { columns: 2, rows: 2 },
        location: ['schematic', 'graph', 'relation', 'basic'],
        preview: { files: 'relation-flow', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'block',
        span: { columns: 2, rows: 2 },
        location: ['schematic', 'graph', 'block', 'basic'],
        preview: { files: 'block-connection', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'group',
        span: { columns: 2, rows: 2 },
        location: ['schematic', 'graph', 'group'],
        preview: { files: 'group-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'flow',
        span: { columns: 2, rows: 2 },
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
        span: { columns: 4, rows: 2 },
        location: ['viz', 'chart', 'points', 'bubble'],
        preview: { files: 'bubble-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'detail-table',
        span: { columns: 2, rows: 2 },
        location: ['viz', 'table', 'detail'],
        preview: { files: 'table-layout-playground', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'polar-tracks',
        span: { columns: 2, rows: 2 },
        location: ['viz', 'plot', 'coordinate', 'composition'],
        preview: { files: 'coordinate-composition-tracks-polar', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'cartesian-coordinate',
        span: { columns: 2, rows: 2 },
        location: ['viz', 'plot', 'coordinate', '2d'],
        preview: { files: 'coordinate-cartesian', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'relation-mark',
        span: { columns: 2, rows: 2 },
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
