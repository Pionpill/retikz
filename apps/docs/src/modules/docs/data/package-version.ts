import corePackage from '../../../../../../packages/kernel/core/package.json';
import foundationPackage from '../../../../../../packages/kernel/foundation/package.json';
import inspectPackage from '../../../../../../packages/kernel/inspect/package.json';
import mathPackage from '../../../../../../packages/kernel/math/package.json';
import reactPackage from '../../../../../../packages/kernel/react/package.json';
import renderPackage from '../../../../../../packages/kernel/render/package.json';
import runtimePackage from '../../../../../../packages/kernel/runtime/package.json';
import texPackage from '../../../../../../packages/kernel/tex/package.json';
import vanillaPackage from '../../../../../../packages/kernel/vanilla/package.json';
import layoutPackage from '../../../../../../packages/library/layout/package.json';
import layoutReactPackage from '../../../../../../packages/library/layout-react/package.json';
import layoutVanillaPackage from '../../../../../../packages/library/layout-vanilla/package.json';
import standardPackage from '../../../../../../packages/library/standard/package.json';
import standardReactPackage from '../../../../../../packages/library/standard-react/package.json';
import standardVanillaPackage from '../../../../../../packages/library/standard-vanilla/package.json';
import diagramPackage from '../../../../../../packages/schematic/diagram/package.json';
import diagramReactPackage from '../../../../../../packages/schematic/diagram-react/package.json';
import diagramVanillaPackage from '../../../../../../packages/schematic/diagram-vanilla/package.json';
import graphPackage from '../../../../../../packages/schematic/graph/package.json';
import graphReactPackage from '../../../../../../packages/schematic/graph-react/package.json';
import graphVanillaPackage from '../../../../../../packages/schematic/graph-vanilla/package.json';
import chartPackage from '../../../../../../packages/viz/chart/package.json';
import chartReactPackage from '../../../../../../packages/viz/chart-react/package.json';
import chartVanillaPackage from '../../../../../../packages/viz/chart-vanilla/package.json';
import dataPackage from '../../../../../../packages/viz/data/package.json';
import plotPackage from '../../../../../../packages/viz/plot/package.json';
import plotReactPackage from '../../../../../../packages/viz/plot-react/package.json';
import plotVanillaPackage from '../../../../../../packages/viz/plot-vanilla/package.json';
import tablePackage from '../../../../../../packages/viz/table/package.json';
import tableReactPackage from '../../../../../../packages/viz/table-react/package.json';
import tableVanillaPackage from '../../../../../../packages/viz/table-vanilla/package.json';

type PackageManifest = {
  name: string;
  version: string;
  retikz: {
    releaseGroup: string;
  };
};

/** 查询文档分组版本所需的最小路由上下文。 */
export type DocPackageLocation = {
  moduleId: string;
  sectionId: string | null;
};

/** Docs 所展示的发布包 manifest，版本和发布组均直接来自各包 package.json。 */
const packageManifests: Array<PackageManifest> = [
  foundationPackage,
  mathPackage,
  runtimePackage,
  corePackage,
  inspectPackage,
  renderPackage,
  reactPackage,
  vanillaPackage,
  texPackage,
  layoutPackage,
  layoutReactPackage,
  layoutVanillaPackage,
  standardPackage,
  standardReactPackage,
  standardVanillaPackage,
  graphPackage,
  graphReactPackage,
  graphVanillaPackage,
  diagramPackage,
  diagramReactPackage,
  diagramVanillaPackage,
  dataPackage,
  plotPackage,
  plotReactPackage,
  plotVanillaPackage,
  chartPackage,
  chartReactPackage,
  chartVanillaPackage,
  tablePackage,
  tableReactPackage,
  tableVanillaPackage,
];

/** 每个 release group 的实际 package 版本集合。 */
const releaseGroupVersions = packageManifests.reduce<Map<string, Set<string>>>((versions, packageManifest) => {
  const { releaseGroup } = packageManifest.retikz;
  const groupVersions = versions.get(releaseGroup) ?? new Set<string>();
  groupVersions.add(packageManifest.version);
  versions.set(releaseGroup, groupVersions);
  return versions;
}, new Map<string, Set<string>>());

/** Docs 路由分组到 package release group 的稳定映射。 */
const docSectionReleaseGroups: Readonly<Record<string, string>> = {
  'kernel/packages': 'kernel',
  'library/layout': 'layout',
  'library/standard': 'standard',
  'schematic/diagram': 'diagram',
  'schematic/graph': 'graph',
  'viz/chart': 'chart',
  'viz/data': 'data',
  'viz/plot': 'plot',
  'viz/table': 'table',
};

/** 获取版本一致的 release group 版本；组内版本未对齐时不显示误导性版本。 */
export const getPackageReleaseVersion = (releaseGroup: string): string | undefined => {
  const versions = releaseGroupVersions.get(releaseGroup);
  return versions?.size === 1 ? Array.from(versions)[0] : undefined;
};

/** 获取文档分组入口应显示的实际 package 版本。 */
export const getDocPackageVersion = (location: DocPackageLocation): string | undefined => {
  if (!location.sectionId) return undefined;

  const releaseGroup = docSectionReleaseGroups[`${location.moduleId}/${location.sectionId}`];
  return releaseGroup ? getPackageReleaseVersion(releaseGroup) : undefined;
};
