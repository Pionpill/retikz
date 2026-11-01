import type { Position } from '@retikz/math';

import type { PathPrimitiveAppearance, ScenePrimitive } from '../../contract';
import { guardProviderOutput } from '../../resolve';
import { createCompositeContractError } from '../../resolve/diagnostics';

/** 校验并脱离 provider 返回的有限二维坐标 */
export const snapshotProviderPosition = (owner: string, value: Position): Position =>
  guardProviderOutput(owner, () => {
    const [x, y] = value;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw createCompositeContractError(`${owner} returned an invalid position; expected a finite [x, y] tuple.`);
    }
    return [x, y];
  });

/**
 * 复制已类型化的 provider JSON 输出，校验有限数并省略对象的可选 undefined 字段
 * @template T 提供者输出类型
 */
export const snapshotProviderOutputJson = <T>(owner: string, value: T, path: string): T => {
  const snapshot = (input: unknown, currentPath: string): unknown => {
    if (typeof input === 'number' && !Number.isFinite(input)) {
      throw createCompositeContractError(`${owner} emit produced a ${currentPath} with a non-finite number.`);
    }
    if (input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) {
      return input.map((entry, index) => snapshot(entry, `${currentPath}[${index}]`));
    }
    const output = Object.create(null) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(input)) {
      if (entry !== undefined) output[key] = snapshot(entry, `${currentPath}.${key}`);
    }
    return output;
  };
  return snapshot(value, path) as T;
};

/** 校验已复制且有限的数值非负；省略的可选值无需校验 */
export const assertProviderOutputNonNegative = (owner: string, value: number | undefined, path: string): void => {
  if (value !== undefined && value < 0) {
    throw createCompositeContractError(`${owner} emit produced an invalid ${path}.`);
  }
};

/** 校验参与视觉边界扩张的样式尺寸 */
const assertSceneBoundsStyle = (owner: string, value: PathPrimitiveAppearance, path: string): void => {
  assertProviderOutputNonNegative(owner, value.strokeWidth, `${path}.strokeWidth`);
  if (value.shadow !== undefined) {
    assertProviderOutputNonNegative(owner, value.shadow.blur, `${path}.shadow.blur`);
  }
};

/** 递归校验 Scene 快照中无法由 TypeScript 表达的领域约束 */
const assertScenePrimitive = (owner: string, value: ScenePrimitive, path: string): void => {
  switch (value.type) {
    case 'rect':
      assertProviderOutputNonNegative(owner, value.width, `${path}.width`);
      assertProviderOutputNonNegative(owner, value.height, `${path}.height`);
      assertSceneBoundsStyle(owner, value, path);
      return;
    case 'ellipse':
      assertProviderOutputNonNegative(owner, value.rx, `${path}.rx`);
      assertProviderOutputNonNegative(owner, value.ry, `${path}.ry`);
      assertSceneBoundsStyle(owner, value, path);
      return;
    case 'path':
      for (const field of ['arrowStart', 'arrowEnd'] as const) {
        const arrow = value[field];
        if (arrow === undefined) continue;
        assertProviderOutputNonNegative(owner, arrow.baseSize, `${path}.${field}.baseSize`);
        assertProviderOutputNonNegative(owner, arrow.markerWidth, `${path}.${field}.markerWidth`);
        assertProviderOutputNonNegative(owner, arrow.markerHeight, `${path}.${field}.markerHeight`);
        arrow.marker.forEach((child, index) => assertScenePrimitive(owner, child, `${path}.${field}.marker[${index}]`));
      }
      assertSceneBoundsStyle(owner, value, path);
      return;
    case 'text':
      assertProviderOutputNonNegative(owner, value.fontSize, `${path}.fontSize`);
      assertProviderOutputNonNegative(owner, value.lineHeight, `${path}.lineHeight`);
      assertProviderOutputNonNegative(owner, value.measuredWidth, `${path}.measuredWidth`);
      assertProviderOutputNonNegative(owner, value.measuredHeight, `${path}.measuredHeight`);
      if (value.lines.length === 0) {
        throw createCompositeContractError(`${owner} emit produced an invalid ${path}.lines.`);
      }
      value.lines.forEach((line, index) => {
        assertProviderOutputNonNegative(owner, line.fontSize, `${path}.lines[${index}].fontSize`);
      });
      return;
    case 'group':
      value.children.forEach((child, index) => assertScenePrimitive(owner, child, `${path}.children[${index}]`));
      return;
  }
};

/** 在统一 fatal boundary 内物化并校验 Shape provider 发出的 Scene primitive 列表 */
export const snapshotScenePrimitives = (owner: string, emitted: Iterable<ScenePrimitive>): Array<ScenePrimitive> =>
  guardProviderOutput(owner, () =>
    Array.from(emitted, primitive => {
      const snapshot = snapshotProviderOutputJson(owner, primitive, 'Scene primitive');
      assertScenePrimitive(owner, snapshot, 'Scene primitive');
      return snapshot;
    }),
  );
