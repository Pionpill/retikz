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
        span: { columns: 5, rows: 3 },
        location: ['library', 'layout', 'introduction'],
        preview: { files: 'layout-nested', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'flex-layout',
        span: { columns: 4, rows: 3 },
        location: ['library', 'layout', 'flex-layout', 'usage'],
        preview: { files: 'flex-layout-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'standard-grid',
        span: { columns: 3, rows: 3 },
        location: ['library', 'standard', 'presentation', 'grid'],
        preview: { files: 'grid-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'shape-composition',
        span: { columns: 4, rows: 2 },
        location: ['library', 'standard', 'shape'],
        preview: { files: 'shape-composition', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'ribbon',
        span: { columns: 4, rows: 2 },
        location: ['library', 'extension', 'ribbon', 'usage'],
        preview: { files: 'ribbon-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'surface',
        span: { columns: 4, rows: 2 },
        location: ['library', 'standard', 'presentation', 'surface'],
        preview: { files: 'surface-overflow', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
  schematic: {
    title: 'schematic.homeTitle',
    description: 'schematic.homeDescription',
    demos: [
      {
        id: 'flow',
        span: { columns: 6, rows: 3 },
        location: ['schematic', 'diagram', 'flow', 'usage'],
        preview: { files: 'flow-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'block',
        span: { columns: 6, rows: 3 },
        location: ['schematic', 'graph', 'block', 'usage'],
        preview: { files: 'block-connection', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'entity-roles',
        span: { columns: 5, rows: 2 },
        location: ['schematic', 'graph', 'entity', 'usage'],
        preview: { files: 'entity-roles', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'group',
        span: { columns: 4, rows: 2 },
        location: ['schematic', 'graph', 'group'],
        preview: { files: 'group-basic', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'relation',
        span: { columns: 3, rows: 2 },
        location: ['schematic', 'graph', 'relation', 'usage'],
        preview: { files: 'relation-flow', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
    ],
  },
  viz: {
    title: 'viz.homeTitle',
    description: 'viz.homeDescription',
    demos: [
      {
        id: 'selector-extrema',
        span: { columns: 4, rows: 1 },
        location: ['viz', 'data', 'operators', 'selector'],
        preview: { files: 'selector-extrema', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'bubble-chart',
        span: { columns: 5, rows: 3 },
        location: ['viz', 'chart', 'points', 'bubble'],
        preview: { files: 'bubble-encodings', responsive: true, size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'regression-marks',
        span: { columns: 4, rows: 2 },
        location: ['viz', 'chart', 'points', 'regression'],
        preview: { files: 'regression-marks', responsive: true, size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'connected-scatter-marks',
        span: { columns: 6, rows: 3 },
        location: ['viz', 'chart', 'points', 'connected-scatter'],
        preview: { files: 'connected-scatter-marks', responsive: true, size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'ranged-dot',
        span: { columns: 4, rows: 2 },
        location: ['viz', 'chart', 'points', 'ranged-dot'],
        preview: { files: 'ranged-dot-basic', responsive: true, size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'polar-strip',
        span: { columns: 5, rows: 3 },
        location: ['viz', 'chart', 'points', 'strip'],
        preview: { files: 'strip-distribution', responsive: true, size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'path-ribbon',
        span: { columns: 4, rows: 2 },
        location: ['viz', 'plot', 'mark', 'path'],
        preview: { files: 'path-ribbon', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'mark-target',
        span: { columns: 4, rows: 2 },
        location: ['viz', 'plot', 'mark', 'path'],
        preview: { files: 'mark-target', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'interval-projection',
        span: { columns: 5, rows: 3 },
        location: ['viz', 'plot', 'mark', 'interval'],
        preview: { files: 'interval-projection', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'coordinate-1d-composition',
        span: { columns: 4, rows: 2 },
        location: ['viz', 'plot', 'coordinate', '1d'],
        preview: { files: 'coordinate-1d-composition', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'radial-bars',
        span: { columns: 2, rows: 2 },
        location: ['viz', 'plot', 'mark', 'interval'],
        preview: { files: 'bar-radial', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'interval-sector',
        span: { columns: 3, rows: 2 },
        location: ['viz', 'plot', 'mark', 'interval'],
        preview: { files: 'interval-sector', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'bar-position',
        span: { columns: 3, rows: 2 },
        location: ['viz', 'plot', 'mark', 'interval'],
        preview: { files: 'bar-position', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'line-curve',
        span: { columns: 3, rows: 2 },
        location: ['viz', 'plot', 'mark', 'path'],
        preview: { files: 'line-curve', size: 'md', ...MODULE_LANDING_PREVIEW },
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
