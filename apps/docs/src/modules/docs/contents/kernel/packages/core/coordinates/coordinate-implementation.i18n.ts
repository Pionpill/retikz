import type { Lang } from '@/i18n';

/** Scope 定位与引用交付的源码流程 */
export const coordinateImplementationI18n: Record<
  Lang,
  Record<
    | 'target'
    | 'placeholder'
    | 'children'
    | 'envelope'
    | 'transforms'
    | 'publish'
    | 'paths'
    | 'group'
    | 'entry'
    | 'geometry',
    string
  >
> = {
  zh: {
    target: 'resolveScopePositionTarget\n先冻结父空间目标',
    placeholder: 'registerScopeLayoutPlaceholder\n再进入局部命名空间',
    children: 'compileChildren\n布局节点、注册坐标、暂存路径',
    envelope: 'createIntrinsicScopeLayout\n汇总子布局包络',
    transforms: 'resolveFinalScopeTransforms\n解析 pivot 与自身锚点对齐',
    publish: 'applyOwnTransformsToPublishedLayout\n更新引用并 replaceLayout',
    paths: 'flushPendingPathEmissions\n绑定引用，回填路径',
    group: 'emitScopeGroup\n出栈后输出局部图元与变换',
    entry: 'state: scope-placeholder',
    geometry: 'state: resolved\n最终世界坐标几何',
  },
  en: {
    target: 'resolveScopePositionTarget\nFreeze the parent-frame target',
    placeholder: 'registerScopeLayoutPlaceholder\nThen enter the local namespace',
    children: 'compileChildren\nLayout, coordinates, deferred paths',
    envelope: 'createIntrinsicScopeLayout\nCollect child layout envelope',
    transforms: 'resolveFinalScopeTransforms\nResolve pivot and self alignment',
    publish: 'applyOwnTransformsToPublishedLayout\nUpdate references and replaceLayout',
    paths: 'flushPendingPathEmissions\nBind references and fill paths',
    group: 'emitScopeGroup\nAfter pop: local primitives and transforms',
    entry: 'state: scope-placeholder',
    geometry: 'state: resolved\nFinal world-space geometry',
  },
};
