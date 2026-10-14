import type { Lang } from '@/i18n';

/** 两类位置解析方向 */
export const positionFlowI18n: Record<
  Lang,
  Record<'local' | 'world' | 'calculate' | 'lookup' | 'project' | 'inverse' | 'result', string>
> = {
  zh: {
    local: '坐标、极坐标、局部偏移',
    world: '节点目标、两点插值',
    calculate: 'resolvePosition\n在当前局部空间计算',
    lookup: 'resolvePositionTargetWorld\n查世界几何与锚点',
    project: 'toWorld\n应用当前变换链',
    inverse: 'toLocal\n反投影到当前空间',
    result: '局部点与世界参考点\n交给布局或路径编译',
  },
  en: {
    local: 'Tuple, polar, local offset',
    world: 'Node target, interpolation',
    calculate: 'resolvePosition\nCompute in the local frame',
    lookup: 'resolvePositionTargetWorld\nRead world geometry and anchors',
    project: 'toWorld\nApply current transform chain',
    inverse: 'toLocal\nInvert into the current frame',
    result: 'Local and world reference points\nFor layout or path compilation',
  },
};
