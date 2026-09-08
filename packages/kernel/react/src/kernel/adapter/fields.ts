import type { IRNode, IRPath, IRScope } from '@retikz/core';
import type { AssertEqual } from '@retikz/foundation';

import type { ScopeStyleProps } from '../protocol';

/**
 * IRNode 纯透传字段表（除 type / position / text / label 特化字段外）
 * @description as const satisfies 拒不存在的 key；下方 _NodeFieldsCheck 静态校验完备性——未来 IRNode 加新字段时漏写此表 TS 编译期报错。builder / unbuilder 共用同一份字段表，两端字段对称变化自动同步
 */
export const NODE_FIELDS = [
  'id',
  'shape',
  'boundary',
  'meta',
  'animations',
  'rotate',
  'cornerRadius',
  'scale',
  'zIndex',
  'style',
  'layout',
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
  'kind',
  'kindOptions',
  'label',
  'id',
  'meta',
  'animations',
  'roundedCorners',
  'zIndex',
  'rotate',
  'scale',
  'marks',
  'style',
] as const satisfies ReadonlyArray<keyof IRPath>;

type _PathFieldsCheck = AssertEqual<(typeof PATH_FIELDS)[number], Exclude<keyof IRPath, 'type' | 'children'>>;
const _assertPathFieldsCheck: _PathFieldsCheck = true;
void _assertPathFieldsCheck;

/**
 * IRScope 纯透传字段表（除 type / children 特化字段外）
 * @description 含容器字段（id / localNamespace / transforms）+ 样式默认字段
 *   （style 级联值与 defaults 通道）；同 NODE_FIELDS 互锁防漂移，builder / unbuilder 共用
 */
export const SCOPE_FIELDS = [
  'theme',
  'id',
  'localNamespace',
  'transforms',
  'placement',
  'zIndex',
  'clip',
  'boundingShape',
  'meta',
  'animations',
  'style',
  'defaults',
] as const satisfies ReadonlyArray<keyof IRScope>;

type _ScopeFieldsCheck = AssertEqual<(typeof SCOPE_FIELDS)[number], Exclude<keyof IRScope, 'type' | 'children'>>;
const _assertScopeFieldsCheck: _ScopeFieldsCheck = true;
void _assertScopeFieldsCheck;

/**
 * ScopeStyleProps 的 key 表——`hasScopeStyle` 判定 + 合成根 Scope 字段透传共用
 * @description 同 NODE_FIELDS 互锁防漂移：下方 _ScopeStyleFieldsCheck 校验它恰好覆盖 ScopeStyleProps 全部 key，
 *   也是 SCOPE_FIELDS 的真子集（不含容器 / 屏障 / 栈序 / 裁剪字段）
 */
export const SCOPE_STYLE_FIELDS = ['style', 'defaults'] as const satisfies ReadonlyArray<keyof ScopeStyleProps>;

type _ScopeStyleFieldsCheck = AssertEqual<(typeof SCOPE_STYLE_FIELDS)[number], keyof ScopeStyleProps>;
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
