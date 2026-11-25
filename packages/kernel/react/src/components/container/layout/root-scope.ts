import type { AssertEqual } from '@retikz/foundation';
import { pickDefined } from '@retikz/foundation';
import type { ReactNode } from 'react';
import { createElement } from 'react';

import type { ScopeStyleProps } from '../../kernel';
import { Scope } from '../../kernel';

/**
 * ScopeStyleProps 的 key 表——`hasScopeStyle` 判定 + 合成根 Scope 字段透传共用
 * @description 同 NODE_FIELDS 互锁防漂移：下方 _ScopeStyleFieldsCheck 校验它恰好覆盖 ScopeStyleProps 全部 key，
 *   也是 SCOPE_FIELDS 的真子集（不含容器 / 屏障 / 栈序 / 裁剪字段）
 */
const SCOPE_STYLE_FIELDS = ['defaults'] as const satisfies ReadonlyArray<keyof ScopeStyleProps>;

type _ScopeStyleFieldsCheck = AssertEqual<(typeof SCOPE_STYLE_FIELDS)[number], keyof ScopeStyleProps>;

const _assertScopeStyleFieldsCheck: _ScopeStyleFieldsCheck = true;
void _assertScopeStyleFieldsCheck;

/** 检查一个已类型化的叶子字段集合是否贡献覆盖，不递归清理复合叶子 */
const hasDefinedFields = (fields: object | undefined): boolean =>
  fields !== undefined && Object.values(fields).some(value => value !== undefined);

/** 仅检查新增命名空间，已有 font、paint 等复合叶子保持自身语义 */
export const pickScopeStyle = (scope: ScopeStyleProps): Partial<ScopeStyleProps> => {
  const picked = pickDefined(scope, SCOPE_STYLE_FIELDS);
  const defaults = picked.defaults;
  if (defaults !== undefined) {
    const { style: nodeStyle, layout: nodeLayout, label: nodeLabel, ...nodeGeometry } = defaults.node ?? {};
    const { style: pathStyle, label: pathLabel, arrow, ...pathGeometry } = defaults.path ?? {};
    const reset = defaults.reset;
    const hasReset = reset === true || (Array.isArray(reset) && reset.length > 0);
    const hasDefaults =
      hasReset ||
      [defaults.style, nodeStyle, nodeLayout, nodeGeometry, pathStyle, pathGeometry, nodeLabel, pathLabel, arrow].some(
        hasDefinedFields,
      );
    if (!hasDefaults) delete picked.defaults;
  }

  return picked;
};

/** 按需把 children 包进携带全图级联样式的合成根 Scope */
export const wrapRootScope = (children: ReactNode, style: ScopeStyleProps): ReactNode => {
  const picked = pickScopeStyle(style);
  return Object.keys(picked).length === 0 ? children : createElement(Scope, picked, children);
};
