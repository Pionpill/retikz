import {
  BlocksIcon,
  ChartColumnIncreasingIcon,
  ChartSplineIcon,
  DatabaseIcon,
  ImagesIcon,
  Layers3Icon,
  NetworkIcon,
  PackageIcon,
  PanelTopIcon,
  TableIcon,
  WorkflowIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { DocModuleId, DocNavigationAreaId } from '@/modules/docs/data';

/** 模块分组在顶栏和模块菜单中共用的图标。 */
export const moduleSectionIcons: Record<DocModuleId, Record<string, LucideIcon>> = {
  kernel: {
    components: BlocksIcon,
    packages: PackageIcon,
    galleries: ImagesIcon,
  },
  library: {
    standard: Layers3Icon,
    layout: PanelTopIcon,
  },
  schematic: {
    graph: NetworkIcon,
    diagram: WorkflowIcon,
  },
  viz: {
    data: DatabaseIcon,
    chart: ChartColumnIncreasingIcon,
    table: TableIcon,
    plot: ChartSplineIcon,
  },
};

/** 解析顶栏中分组名称的显示文本。 */
export const resolveHeaderSectionLabel = (label: string, language: string | undefined): string => {
  if (!language?.startsWith('zh')) return label;
  return label.split(' · ').at(-1) ?? label;
};

/** 解析顶栏平铺导航的分组图标，画廊与 About 保持纯文本。 */
export const resolveHeaderSectionIcon = (areaId: DocNavigationAreaId, sectionId: string): LucideIcon | undefined => {
  if (areaId === 'about' || (areaId === 'kernel' && sectionId === 'galleries')) return undefined;
  return moduleSectionIcons[areaId][sectionId];
};
