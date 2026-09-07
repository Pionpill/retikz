import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { ModuleLandingDemo } from '@/modules/docs/components';
import type { DocModuleId, I18nKey } from '@/modules/docs/data';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import { MODULE_LANDING_PREVIEW, ModuleLandingPage } from '@/modules/docs/components';
type ModuleHomeAction = {
  /** 入口按钮的翻译键。 */
  label: I18nKey;
  /** 入口目标地址。 */
  href: string;
};

type ModuleHomeConfiguration = {
  /** 模块首页的定位标题。 */
  title: I18nKey;
  /** 模块首页的简短定位文案。 */
  description: I18nKey;
  /** 左侧主要入口。 */
  primaryAction: ModuleHomeAction;
  /** 右侧按钮组入口。 */
  actions: ReadonlyArray<ModuleHomeAction>;
  /** 模块的代表性演示。 */
  demos: ReadonlyArray<ModuleLandingDemo>;
};

const MODULE_HOME_CONFIGURATIONS: Record<DocModuleId, ModuleHomeConfiguration> = {
  kernel: {
    title: 'kernel.homeTitle',
    description: 'kernel.homeDescription',
    primaryAction: { label: 'kernel.getStart', href: '/kernel/get-start' },
    actions: [
      { label: 'kernel.concepts', href: '/kernel/concepts/basic/coordinate-system' },
      { label: 'kernel.components', href: '/kernel/components/node/overview' },
      { label: 'kernel.examples', href: '/kernel/examples/karl-circle' },
    ],
    demos: [
      {
        id: 'architecture',
        layout: 'feature',
        location: ['kernel', 'concepts', 'design', 'principles'],
        preview: { files: 'principles-packages', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'primitive-model',
        layout: 'compact',
        location: ['kernel', 'concepts', 'core', 'primitive-model'],
        preview: { files: 'node-model-layers', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'coordinate-system',
        layout: 'compact',
        location: ['kernel', 'concepts', 'basic', 'coordinate-system'],
        preview: { files: 'coordinate-system', size: 'md', ...MODULE_LANDING_PREVIEW },
      },
      {
        id: 'karl-circle',
        layout: 'compact',
        location: ['kernel', 'examples', 'karl-circle'],
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
    primaryAction: { label: 'library.standard', href: '/library/standard/composite/grid' },
    actions: [
      { label: 'library.layout', href: '/library/layout/flex-layout' },
      { label: 'library.standardGrid', href: '/library/standard/composite/grid' },
      { label: 'library.standardSurface', href: '/library/standard/composite/surface' },
    ],
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
    primaryAction: { label: 'schematic.introduction', href: '/schematic/introduction' },
    actions: [
      { label: 'schematic.graph', href: '/schematic/graph/entity/basic' },
      { label: 'schematic.block', href: '/schematic/graph/block/basic' },
      { label: 'schematic.flowDiagram', href: '/schematic/diagram/flow/basic' },
    ],
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
    primaryAction: { label: 'viz.getStart', href: '/viz/get-start' },
    actions: [
      { label: 'viz.data', href: '/viz/data/model/contract' },
      { label: 'viz.chart', href: '/viz/chart/points/bubble' },
      { label: 'viz.table', href: '/viz/table/detail' },
      { label: 'viz.drawingGrammar', href: '/viz/plot/coordinate/2d' },
    ],
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
  const navigation = (
    <>
      <Button asChild variant="default">
        <Link to={configuration.primaryAction.href}>{t(configuration.primaryAction.label)}</Link>
      </Button>
      <ButtonGroup>
        {configuration.actions.map((action, index) => (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className={cn(
              index > 0 && 'rounded-l-none border-l-0',
              index < configuration.actions.length - 1 && 'rounded-r-none',
            )}
          >
            <Link to={action.href}>{t(action.label)}</Link>
          </Button>
        ))}
      </ButtonGroup>
    </>
  );

  return (
    <ModuleLandingPage
      title={t(configuration.title)}
      description={t(configuration.description)}
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
