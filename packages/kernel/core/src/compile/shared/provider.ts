import type { Position } from '@retikz/math';

import type { PathPrimitiveAppearance, ScenePrimitive } from '../../contract';
import { guardProviderOutput, createCompositeContractError } from '../../resolve';

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
export const snapshotProviderOutputJson = <T>(
  owner: string,
  value: T,
  path: string,
  allowedResourceIds?: ReadonlySet<string>,
): T => {
  /** ⚡复用递归路径槽位，仅失败时组装完整诊断字符串，减少路径字符串分配 */
  const pathSegments: Array<string | number> = [];
  /** 将当前深度的路径槽位拼接为诊断路径 */
  const formatCurrentPath = (depth: number): string => {
    let currentPath = path;
    for (let index = 0; index < depth; index++) {
      const segment = pathSegments[index];
      currentPath += typeof segment === 'number' ? `[${segment}]` : `.${segment}`;
    }
    return currentPath;
  };

  /** 递归复制 JSON 值并检查数值与资源引用，元数据不参与资源引用检查 */
  const snapshotValue = (
    input: unknown,
    depth: number,
    shouldCheckResources = allowedResourceIds !== undefined,
  ): unknown => {
    if (typeof input === 'number' && !Number.isFinite(input)) {
      throw createCompositeContractError(
        `${owner} emit produced a ${formatCurrentPath(depth)} with a non-finite number.`,
      );
    }
    if (input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) {
      return input.map((entry, index) => {
        pathSegments[depth] = index;
        return snapshotValue(entry, depth + 1, shouldCheckResources);
      });
    }
    if (shouldCheckResources) {
      if ('resources' in input || ('clipRef' in input && input.clipRef !== undefined)) {
        throw createCompositeContractError(
          `${owner} output ${formatCurrentPath(depth)}: provider cannot declare resources or clipRef; use input properties instead.`,
        );
      }
      if (
        'kind' in input &&
        input.kind === 'resourceRef' &&
        (!('id' in input) || !allowedResourceIds?.has(input.id as string))
      ) {
        throw createCompositeContractError(
          `${owner} output ${formatCurrentPath(depth)}: resource reference '${'id' in input ? String(input.id) : ''}' was not supplied to this provider; use input fill or stroke instead.`,
        );
      }
    }
    const output = Object.create(null) as Record<string, unknown>;
    const fields = input as Record<string, unknown>;
    /** ⚡分别保存键和值，减少键值对数组分配；先完整取值再递归，保持 getter 时序 */
    const keys = Object.keys(fields);
    const values = keys.map(key => fields[key]);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const entry = values[index];
      if (entry !== undefined) {
        pathSegments[depth] = key;
        output[key] = snapshotValue(entry, depth + 1, shouldCheckResources && key !== 'meta');
      }
    }
    return output;
  };
  return snapshotValue(value, 0) as T;
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
export const snapshotScenePrimitives = (
  owner: string,
  emitted: Iterable<ScenePrimitive>,
  allowedResourceIds: ReadonlySet<string> = new Set(),
): Array<ScenePrimitive> =>
  guardProviderOutput(owner, () => {
    if ('resources' in emitted)
      throw createCompositeContractError(`${owner} output: provider cannot declare resources.`);
    return Array.from(emitted, primitive => {
      const primitiveSnapshot = snapshotProviderOutputJson(owner, primitive, 'Scene primitive', allowedResourceIds);
      assertScenePrimitive(owner, primitiveSnapshot, 'Scene primitive');
      return primitiveSnapshot;
    });
  });

/** 将定义作者的已类型化图元输出物化为独立 JSON 快照，不维护能力专属字段白名单 */
export const materializeScenePrimitives = (
  owner: string,
  emitted: Iterable<ScenePrimitive>,
  allowedResourceIds: ReadonlySet<string> = new Set(),
): Array<ScenePrimitive> =>
  guardProviderOutput(owner, () => {
    if ('resources' in emitted)
      throw createCompositeContractError(`${owner} output: provider cannot declare resources.`);
    return Array.from(emitted, primitive =>
      snapshotProviderOutputJson(owner, primitive, 'Scene primitive', allowedResourceIds),
    );
  });
