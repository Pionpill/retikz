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
] as const satisfies ReadonlyArray<keyof IRScope>;

type _ScopeFieldsCheck = AssertEqual<
  (typeof SCOPE_FIELDS)[number],
  Exclude<keyof IRScope, 'type' | 'children'>
>;
const _assertScopeFieldsCheck: _ScopeFieldsCheck = true;
void _assertScopeFieldsCheck;

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
