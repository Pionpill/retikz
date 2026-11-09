/** 实体编译依赖图的双语文案 */
export const compilationImplementationI18n = {
  zh: {
    input: '按实体进入解析与计算',
    scope: '进入子树前准备定位与变换',
    node: 'layoutNode → emitNode',
    coordinate: 'evaluatePosition → 局部位置',
    envelope: '子布局 → 包络与分组属性',
    path: 'bindPathTargets → 路径输出',
    scene: '回填路径、排序并组装',
  },
  en: {
    input: 'Resolve and compute by entity',
    scope: 'Prepare placement before child traversal',
    node: 'layoutNode → emitNode',
    coordinate: 'evaluatePosition → local position',
    envelope: 'Child layouts → envelope and group',
    path: 'bindPathTargets → path output',
    scene: 'Fill path slots, sort and assemble',
  },
};
