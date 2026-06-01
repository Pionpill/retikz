import type { AssertEqual, IRNode, IRPath, IRScope } from '@retikz/core';

/**
 * IRNode 纯透传字段表（除 type / position / text / label 特化字段外）
 * @description as const satisfies 拒不存在的 key；下方 _NodeFieldsCheck 静态校验完备性——未来 IRNode 加新字段时漏写此表 TS 编译期报错。builder / unbuilder 共用同一份字段表，两端字段对称变化自动同步。
 */
export const NODE_FIELDS = [
  'id',
  'shape',
  'rotate',
  'align',
  'lineHeight',
  'maxTextWidth',
  'color',
  'fill',
  'fillOpacity',
  'stroke',
  'drawOpacity',
  'strokeWidth',
  'dashed',
  'dotted',
  'dashArray',
  'roundedCorners',
  'minimumWidth',
  'minimumHeight',
  'minimumSize',
  'scale',
  'xScale',
  'yScale',
  'textColor',
  'opacity',
  'innerXSep',
  'innerYSep',
  'outerSep',
  'padding',
  'margin',
  'font',
  'zIndex',
] as const satisfies ReadonlyArray<keyof IRNode>;

// 完备性互锁：NODE_FIELDS 必须恰好覆盖 IRNode 除特化字段外的所有 key
type _NodeFieldsCheck = AssertEqual<
  (typeof NODE_FIELDS)[number],
  Exclude<keyof IRNode, 'type' | 'position' | 'text' | 'label'>
>;
const _assertNodeFieldsCheck: _NodeFieldsCheck = true;
void _assertNodeFieldsCheck;

/**
 * IRPath 纯透传字段表（除 type / children 特化字段外）
 * @description 同 NODE_FIELDS 互锁防漂移
 */
export const PATH_FIELDS = [
  'color',
  'stroke',
  'strokeWidth',
  'dashPattern',
  'arrow',
  'arrowDetail',
  'fill',
  'fillRule',
  'lineCap',
  'lineJoin',
  'thickness',
  'opacity',
  'fillOpacity',
  'drawOpacity',
  'zIndex',
  'rotate',
  'scale',
  'marks',
] as const satisfies ReadonlyArray<keyof IRPath>;

type _PathFieldsCheck = AssertEqual<
  (typeof PATH_FIELDS)[number],
  Exclude<keyof IRPath, 'type' | 'children'>
>;
const _assertPathFieldsCheck: _PathFieldsCheck = true;
void _assertPathFieldsCheck;

/**
 * IRScope 纯透传字段表（除 type / children 特化字段外）
 * @description 含 alpha.1 容器字段（id / localNamespace / transforms）+ alpha.2 样式默认字段
 *   （级联 graphic state + 四通道 every-X + resetStyle）；同 NODE_FIELDS 互锁防漂移，builder / unbuilder 共用
 */
export const SCOPE_FIELDS = [
  'id',
  'localNamespace',
  'transforms',
  'color',
  'stroke',
  'fill',
  'strokeWidth',
  'opacity',
  'fillOpacity',
  'drawOpacity',
  'nodeDefault',
  'pathDefault',
  'labelDefault',
  'arrowDefault',
  'resetStyle',
  'zIndex',
  'clip',
] as const satisfies ReadonlyArray<keyof IRScope>;

type _ScopeFieldsCheck = AssertEqual<
  (typeof SCOPE_FIELDS)[number],
  Exclude<keyof IRScope, 'type' | 'children'>
>;
const _assertScopeFieldsCheck: _ScopeFieldsCheck = true;
void _assertScopeFieldsCheck;

/**
 * Scope 级联样式 props 子集——`<Scope>` 与 `<Layout>` 共用同一份定义，避免两处漂移
 * @description 取 IRScope 的「级联样式」通道（graphic state + 四通道 every-X），**不含**容器 / 命名空间 /
 *   局部变换语义字段（`id` / `localNamespace` / `transforms` / `resetStyle` / `zIndex` / `clip`）——这些挂在
 *   顶层 `<Layout>` 上要么无意义、要么语义易混（详 ADR-01 v0.2-beta.2「暴露哪些 Scope props」）。
 *   `<Layout>` 设任一字段时把 children 包进合成根 `<Scope>`，编译产物 = 用户手写一层根 `<Scope>` 的同一 IR。
 */
export type ScopeStyleProps = {
  /** 级联主色（TikZ scope `color=`）；内部元素 stroke / fill / 文字未单设则随它，并级联到边 label / 箭头 */
  color?: IRScope['color'];
  /** 级联默认描边色（覆盖主色的 stroke 通道） */
  stroke?: IRScope['stroke'];
  /** 级联默认填充色 */
  fill?: IRScope['fill'];
  /** 级联默认描边宽度（user units） */
  strokeWidth?: IRScope['strokeWidth'];
  /** 级联默认整体透明度 0~1（嵌套替换、不复合，与 TikZ 默认一致） */
  opacity?: IRScope['opacity'];
  /** 级联默认填充透明度 0~1 */
  fillOpacity?: IRScope['fillOpacity'];
  /** 级联默认描边透明度 0~1（TikZ `draw opacity`） */
  drawOpacity?: IRScope['drawOpacity'];
  /** every node 默认样式（TikZ `every node`），扁平独立通道 */
  nodeDefault?: IRScope['nodeDefault'];
  /** every path 默认样式（TikZ `every path`）；箭头走 arrowDefault 通道 */
  pathDefault?: IRScope['pathDefault'];
  /** every label 默认样式（node label + step label 共享） */
  labelDefault?: IRScope['labelDefault'];
  /** every arrow 默认样式（TikZ `every arrow`） */
  arrowDefault?: IRScope['arrowDefault'];
};

/**
 * ScopeStyleProps 的 key 表——`hasScopeStyle` 判定 + 合成根 Scope 字段透传共用
 * @description 同 NODE_FIELDS 互锁防漂移：下方 _ScopeStyleFieldsCheck 校验它恰好覆盖 ScopeStyleProps 全部 key，
 *   也是 SCOPE_FIELDS 的真子集（不含容器 / 屏障 / 栈序 / 裁剪字段）
 */
export const SCOPE_STYLE_FIELDS = [
  'color',
  'stroke',
  'fill',
  'strokeWidth',
  'opacity',
  'fillOpacity',
  'drawOpacity',
  'nodeDefault',
  'pathDefault',
  'labelDefault',
  'arrowDefault',
] as const satisfies ReadonlyArray<keyof ScopeStyleProps>;

type _ScopeStyleFieldsCheck = AssertEqual<
  (typeof SCOPE_STYLE_FIELDS)[number],
  keyof ScopeStyleProps
>;
const _assertScopeStyleFieldsCheck: _ScopeStyleFieldsCheck = true;
void _assertScopeStyleFieldsCheck;

/**
 * 从源对象按字段表拣出 defined 字段
 * @description 只透传 `!== undefined` 的字段；调用方与特化字段合并成完整目标对象
 */
export const pickDefined = <TSource extends object, TKey extends keyof TSource>(
  source: TSource,
  fields: ReadonlyArray<TKey>,
): Partial<Pick<TSource, TKey>> => {
  const out: Partial<Pick<TSource, TKey>> = {};
  for (const key of fields) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
};
