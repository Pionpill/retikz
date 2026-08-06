import type { InspectionPlane, Scene } from '@retikz/core';

import type { SvgNode } from '../types';

/** 把单个辅助 Scene 编译为带独立资源命名空间的 SVG 内容 */
export type BuildSvgInspectionScene = (scene: Scene, entryIndex: number) => ReadonlyArray<SvgNode>;

/** 把独立 inspection plane 物化为主图之后的不可交互 SVG 分组 */
export const buildSvgInspectionGroup = (inspection: InspectionPlane, buildScene: BuildSvgInspectionScene): SvgNode => ({
  tag: 'g',
  attrs: {
    'data-retikz-inspection': 'layout',
    'pointer-events': 'none',
    'aria-hidden': 'true',
  },
  children: inspection.entries.map((entry, entryIndex) => ({
    tag: 'g',
    attrs: { transform: `matrix(${entry.transform.join(' ')})` },
    children: [...buildScene(entry.scene, entryIndex)],
  })),
});
