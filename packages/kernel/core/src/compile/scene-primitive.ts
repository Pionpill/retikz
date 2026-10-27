import type { Position } from '@retikz/math';

import type { ScenePrimitive } from '../contract';
import { createCompositeContractError } from '../resolve/diagnostics';
import { withProviderOutputValidationBoundary as validateProviderOutput } from '../resolve/provider-validation';
import { BlendMode, FontStyle, PathFillRule, PathLineCap, PathLineJoin } from '../schemas';

/**
 * 在 provider 返回后的统一边界把未知 validation failure 分类为 fatal contract error
 * @template T 校验回调成功时返回的值类型
 */
export const withProviderOutputValidationBoundary = <T>(owner: string, validate: () => T): T =>
  validateProviderOutput(owner, validate);

/** 校验并脱离 provider 返回的有限二维坐标 */
export const snapshotProviderPosition = (owner: string, value: unknown): Position =>
  withProviderOutputValidationBoundary(owner, () => {
    if (!Array.isArray(value)) {
      throw createCompositeContractError(`${owner} returned an invalid position; expected a finite [x, y] tuple.`);
    }

    const length = value.length;
    const x = value[0];
    const y = value[1];
    if (length !== 2 || typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw createCompositeContractError(`${owner} returned an invalid position; expected a finite [x, y] tuple.`);
    }

    return [x, y];
  });

/** 抛出带 provider owner 的 fatal output contract error */
export const failProviderOutput = (owner: string, detail: string): never => {
  throw createCompositeContractError(`${owner} emit produced ${detail}.`);
};

/**
 * 物化 provider plain JSON 输出，同时省略对象的可选 undefined 字段
 * @template T 校验并复制为 JSON 快照的提供者输出类型
 */
export const snapshotProviderOutputJson = <T>(owner: string, value: T, path: string): T => {
  const active = new WeakSet<object>();

  const readDataDescriptor = (
    input: object,
    key: string,
    currentPath: string,
    requireEnumerable = true,
  ): PropertyDescriptor & Readonly<{ value: unknown }> => {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !('value' in descriptor) || (requireEnumerable && !descriptor.enumerable)) {
      failProviderOutput(owner, `${currentPath} with a hidden or accessor field '${key}'`);
    }

    return descriptor as PropertyDescriptor & Readonly<{ value: unknown }>;
  };

  const snapshot = (input: unknown, currentPath: string): unknown => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) failProviderOutput(owner, `a ${currentPath} with a non-finite number`);
      return input;
    }

    if (typeof input === 'function') failProviderOutput(owner, `a ${currentPath} containing a function`);
    if (typeof input !== 'object') failProviderOutput(owner, `a non-JSON ${currentPath}`);

    const objectInput = input as object;
    if (active.has(objectInput)) failProviderOutput(owner, `a cyclic ${currentPath}`);
    active.add(objectInput);

    try {
      const prototype = Object.getPrototypeOf(objectInput);
      const keys = Reflect.ownKeys(objectInput);
      const stringKeys: Array<string> = [];

      for (const key of keys) {
        if (typeof key === 'string') {
          stringKeys.push(key);
        } else {
          failProviderOutput(owner, `${currentPath} with an unsupported symbol field`);
        }
      }

      if (Array.isArray(objectInput)) {
        if (prototype !== Array.prototype) failProviderOutput(owner, `a non-plain ${currentPath}`);
        const descriptors = new Map<string, PropertyDescriptor & Readonly<{ value: unknown }>>();

        for (const key of stringKeys) {
          descriptors.set(key, readDataDescriptor(objectInput, key, currentPath, key !== 'length'));
        }

        const lengthDescriptor = descriptors.get('length');
        const length = lengthDescriptor?.value;
        if (
          typeof length !== 'number' ||
          !Number.isSafeInteger(length) ||
          length < 0 ||
          descriptors.size !== length + 1
        ) {
          failProviderOutput(owner, `a sparse or extended ${currentPath}`);
        }

        const output: Array<unknown> = [];

        for (let index = 0; index < length; index += 1) {
          const descriptor = descriptors.get(String(index));
          if (descriptor === undefined) {
            return failProviderOutput(owner, `a sparse or accessor ${currentPath}`);
          }

          output.push(snapshot(descriptor.value, `${currentPath}[${index}]`));
        }

        return output;
      }

      if (prototype !== Object.prototype && prototype !== null) {
        failProviderOutput(owner, `a non-plain ${currentPath}`);
      }

      const output = Object.create(null) as Record<string, unknown>;

      for (const key of stringKeys) {
        const descriptor = readDataDescriptor(objectInput, key, currentPath);
        if (descriptor.value !== undefined) output[key] = snapshot(descriptor.value, `${currentPath}.${key}`);
      }

      return output;
    } finally {
      active.delete(objectInput);
    }
  };

  return snapshot(value, path) as T;
};

/** 读取对象的全部自有字符串键，并拒绝 symbol、隐藏字段与 accessor */
const providerOutputOwnStringKeys = (
  owner: string,
  value: object,
  path: string,
  arrayLength = false,
): Array<string> => {
  const keys = Reflect.ownKeys(value);
  const stringKeys: Array<string> = [];

  for (const key of keys) {
    if (typeof key === 'symbol') {
      failProviderOutput(owner, `${path} with an unsupported symbol field`);
    }

    const stringKey = key as string;
    const descriptor = Object.getOwnPropertyDescriptor(value, stringKey);
    if (
      descriptor === undefined ||
      ((!arrayLength || key !== 'length') && (!descriptor.enumerable || !('value' in descriptor)))
    ) {
      failProviderOutput(owner, `${path} with a hidden or accessor field '${stringKey}'`);
    }

    stringKeys.push(stringKey);
  }

  return stringKeys;
};

/** 读取 provider plain record，并拒绝数组、class instance 与代理异常 */
export const providerOutputRecord = (owner: string, value: unknown, path: string): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    failProviderOutput(owner, `an invalid ${path}`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) failProviderOutput(owner, `a non-plain ${path}`);
  providerOutputOwnStringKeys(owner, value as object, path);

  return value as Record<string, unknown>;
};

/** 读取 dense plain array，并拒绝 symbol、自定义字段、空洞与 accessor */
export const providerOutputArray = (owner: string, value: unknown, path: string): Array<unknown> => {
  if (!Array.isArray(value)) {
    failProviderOutput(owner, `an invalid ${path}`);
  }

  if (Object.getPrototypeOf(value) !== Array.prototype) failProviderOutput(owner, `an invalid ${path}`);
  const keys = providerOutputOwnStringKeys(owner, value as object, path, true);
  const entries = value as Array<unknown>;

  for (const key of keys) {
    if (key === 'length') continue;
    if (!/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= entries.length) {
      failProviderOutput(owner, `${path} with an unsupported field '${key}'`);
    }
  }

  for (let index = 0; index < entries.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(entries, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      failProviderOutput(owner, `a sparse or accessor ${path}`);
    }
  }

  return entries;
};

/** 校验 provider object 的全部自有键都在显式白名单内 */
export const assertProviderOutputKeys = (
  owner: string,
  value: Record<string, unknown>,
  allowed: ReadonlyArray<string>,
  path: string,
): void => {
  const unsupported = providerOutputOwnStringKeys(owner, value, path).filter(key => !allowed.includes(key));
  if (unsupported.length > 0) {
    failProviderOutput(owner, `${path} with unsupported field(s): ${unsupported.join(', ')}`);
  }
};

/** 校验 provider number 为 finite，可选要求非负 */
export const assertProviderOutputFinite = (owner: string, value: unknown, path: string, nonNegative = false): void => {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    failProviderOutput(owner, `a non-finite ${path}`);
  }

  if (typeof value !== 'number' || (nonNegative && value < 0)) {
    failProviderOutput(owner, `an invalid ${path}`);
  }
};

/** 校验可选 provider number 字段 */
export const assertProviderOutputOptionalFinite = (
  owner: string,
  value: Record<string, unknown>,
  field: string,
  path: string,
  nonNegative = false,
): void => {
  if (value[field] !== undefined) {
    assertProviderOutputFinite(owner, value[field], `${path}.${field}`, nonNegative);
  }
};

/** 校验可选 provider number 字段位于闭区间 `[0, 1]` */
export const assertProviderOutputUnitInterval = (
  owner: string,
  value: Record<string, unknown>,
  field: string,
  path: string,
): void => {
  if (value[field] === undefined) return;

  assertProviderOutputFinite(owner, value[field], `${path}.${field}`);
  if ((value[field] as number) < 0 || (value[field] as number) > 1) {
    failProviderOutput(owner, `an invalid ${path}.${field}`);
  }
};

/** 校验 Scene 或 Marker 的 paint 值，Marker 模式禁止 resourceRef */
const assertProviderOutputPaint = (owner: string, value: unknown, path: string, markerOnly = false): void => {
  if (value === undefined || typeof value === 'string') return;

  const candidate = providerOutputRecord(owner, value, path);
  const keyCount = providerOutputOwnStringKeys(owner, candidate, path).length;
  const contextStroke = candidate.kind === 'contextStroke' && keyCount === 1;
  const resourceRef =
    !markerOnly &&
    candidate.kind === 'resourceRef' &&
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    keyCount === 2;
  if (!contextStroke && !resourceRef) {
    failProviderOutput(
      owner,
      markerOnly
        ? `marker ${path} must be a color string or { kind: 'contextStroke' }; external paint references are not allowed`
        : `an invalid ${path}`,
    );
  }
};

/** 校验 dash pattern 是 dense finite 非负数组 */
const assertProviderOutputDashPattern = (owner: string, value: Record<string, unknown>, path: string): void => {
  if (value.dashPattern === undefined) return;

  providerOutputArray(owner, value.dashPattern, `${path}.dashPattern`).forEach((entry, index) =>
    assertProviderOutputFinite(owner, entry, `${path}.dashPattern[${index}]`, true),
  );
};

/** 校验 Scene/Marker 的结构化 transform 数组 */
const assertProviderOutputTransforms = (owner: string, value: unknown, path: string): void => {
  if (value === undefined) return;

  providerOutputArray(owner, value, path).forEach((transform, index) => {
    const candidate = providerOutputRecord(owner, transform, `${path}[${index}]`);
    if (candidate.kind === 'translate') {
      assertProviderOutputKeys(owner, candidate, ['kind', 'x', 'y'], `${path}[${index}]`);
      assertProviderOutputFinite(owner, candidate.x, `${path}[${index}].x`);
      assertProviderOutputFinite(owner, candidate.y, `${path}[${index}].y`);
    } else if (candidate.kind === 'rotate') {
      assertProviderOutputKeys(owner, candidate, ['kind', 'degrees', 'cx', 'cy'], `${path}[${index}]`);
      assertProviderOutputFinite(owner, candidate.degrees, `${path}[${index}].degrees`);
      assertProviderOutputOptionalFinite(owner, candidate, 'cx', `${path}[${index}]`);
      assertProviderOutputOptionalFinite(owner, candidate, 'cy', `${path}[${index}]`);
    } else if (candidate.kind === 'scale') {
      assertProviderOutputKeys(owner, candidate, ['kind', 'x', 'y'], `${path}[${index}]`);
      assertProviderOutputFinite(owner, candidate.x, `${path}[${index}].x`);
      assertProviderOutputOptionalFinite(owner, candidate, 'y', `${path}[${index}]`);
    } else {
      failProviderOutput(owner, `an invalid ${path}[${index}].kind`);
    }
  });
};

/** 校验 Scene/Marker path 的 fill/stroke enum 字段 */
const assertProviderOutputPathEnums = (owner: string, value: Record<string, unknown>, path: string): void => {
  if (value.fillRule !== undefined && !Object.values(PathFillRule).includes(value.fillRule as never)) {
    failProviderOutput(owner, `an invalid ${path}.fillRule`);
  }

  if (value.lineCap !== undefined && !Object.values(PathLineCap).includes(value.lineCap as never)) {
    failProviderOutput(owner, `an invalid ${path}.lineCap`);
  }

  if (value.lineJoin !== undefined && !Object.values(PathLineJoin).includes(value.lineJoin as never)) {
    failProviderOutput(owner, `an invalid ${path}.lineJoin`);
  }
};

/** 校验 Scene geometry primitive 的共享 paint/style 字段 */
const assertSceneStyle = (owner: string, value: Record<string, unknown>, scenePath: string): void => {
  /** 校验 Scene resolved shadow 的 required 字段与范围 */
  const assertResolvedShadow = (providerOwner: string, shadowValue: unknown, shadowPath: string): void => {
    if (shadowValue === undefined) return;

    const shadow = providerOutputRecord(providerOwner, shadowValue, shadowPath);
    assertProviderOutputKeys(providerOwner, shadow, ['offsetX', 'offsetY', 'blur', 'color', 'opacity'], shadowPath);
    assertProviderOutputFinite(providerOwner, shadow.offsetX, `${shadowPath}.offsetX`);
    assertProviderOutputFinite(providerOwner, shadow.offsetY, `${shadowPath}.offsetY`);
    if (typeof shadow.color !== 'string') failProviderOutput(providerOwner, `an invalid ${shadowPath}.color`);
    assertProviderOutputOptionalFinite(providerOwner, shadow, 'blur', shadowPath, true);
    assertProviderOutputUnitInterval(providerOwner, shadow, 'opacity', shadowPath);
  };

  assertProviderOutputPaint(owner, value.fill, `${scenePath}.fill`);
  assertProviderOutputPaint(owner, value.stroke, `${scenePath}.stroke`);
  assertProviderOutputUnitInterval(owner, value, 'fillOpacity', scenePath);
  assertProviderOutputUnitInterval(owner, value, 'strokeOpacity', scenePath);
  assertProviderOutputUnitInterval(owner, value, 'opacity', scenePath);
  assertProviderOutputOptionalFinite(owner, value, 'strokeWidth', scenePath, true);
  assertProviderOutputOptionalFinite(owner, value, 'dashOffset', scenePath);
  assertProviderOutputDashPattern(owner, value, scenePath);
  assertProviderOutputPathEnums(owner, value, scenePath);
  if (value.blendMode !== undefined && !Object.values(BlendMode).includes(value.blendMode as never)) {
    failProviderOutput(owner, `an invalid ${scenePath}.blendMode`);
  }

  assertResolvedShadow(owner, value.shadow, `${scenePath}.shadow`);
};

/** Scene recursive validation 所需的 active-path 与 Marker 子集入口 */
type SceneValidationContext = Readonly<{
  active: WeakSet<object>;
}>;

/** 递归校验单个 Scene primitive 并沿当前 group 路径检测循环 */
const visitScenePrimitive = (
  owner: string,
  primitive: unknown,
  scenePath: string,
  context: SceneValidationContext,
): void => {
  const value = primitive as Record<string, unknown>;

  switch (value.type) {
    case 'rect':
      assertProviderOutputFinite(owner, value.x, `${scenePath}.x`);
      assertProviderOutputFinite(owner, value.y, `${scenePath}.y`);
      assertProviderOutputFinite(owner, value.width, `${scenePath}.width`, true);
      assertProviderOutputFinite(owner, value.height, `${scenePath}.height`, true);
      assertProviderOutputOptionalFinite(owner, value, 'cornerRadius', scenePath, true);
      assertSceneStyle(owner, value, scenePath);

      return;
    case 'ellipse':
      assertProviderOutputFinite(owner, value.cx, `${scenePath}.cx`);
      assertProviderOutputFinite(owner, value.cy, `${scenePath}.cy`);
      assertProviderOutputFinite(owner, value.rx, `${scenePath}.rx`, true);
      assertProviderOutputFinite(owner, value.ry, `${scenePath}.ry`, true);
      assertProviderOutputOptionalFinite(owner, value, 'rotate', scenePath);
      assertSceneStyle(owner, value, scenePath);

      return;
    case 'path': {
      assertProviderOutputPathEnums(owner, value, scenePath);

      for (const field of ['arrowStart', 'arrowEnd'] as const) {
        if (value[field] === undefined) continue;

        const arrow = value[field] as Record<string, unknown>;
        if (typeof arrow.shape !== 'string') failProviderOutput(owner, `an invalid ${scenePath}.${field}.shape`);
        assertProviderOutputFinite(owner, arrow.baseSize, `${scenePath}.${field}.baseSize`, true);
        assertProviderOutputFinite(owner, arrow.refX, `${scenePath}.${field}.refX`);
        assertProviderOutputFinite(owner, arrow.markerWidth, `${scenePath}.${field}.markerWidth`, true);
        assertProviderOutputFinite(owner, arrow.markerHeight, `${scenePath}.${field}.markerHeight`, true);
        assertProviderOutputUnitInterval(owner, arrow, 'opacity', `${scenePath}.${field}`);
        const marker = arrow.marker as Array<unknown>;
        marker.forEach((child, index) =>
          visitScenePrimitive(owner, child, `${scenePath}.${field}.marker[${index}]`, context),
        );
      }

      assertSceneStyle(owner, value, scenePath);

      return;
    }
    case 'text': {
      assertProviderOutputFinite(owner, value.x, `${scenePath}.x`);
      assertProviderOutputFinite(owner, value.y, `${scenePath}.y`);
      assertProviderOutputFinite(owner, value.fontSize, `${scenePath}.fontSize`, true);
      assertProviderOutputFinite(owner, value.lineHeight, `${scenePath}.lineHeight`, true);
      assertProviderOutputFinite(owner, value.measuredWidth, `${scenePath}.measuredWidth`, true);
      assertProviderOutputFinite(owner, value.measuredHeight, `${scenePath}.measuredHeight`, true);

      const lines = value.lines as Array<unknown>;
      if (lines.length === 0) failProviderOutput(owner, `an invalid ${scenePath}.lines`);
      lines.forEach((line, index) => {
        const candidate = line as Record<string, unknown>;
        if (typeof candidate.text !== 'string')
          failProviderOutput(owner, `an invalid ${scenePath}.lines[${index}].text`);
        assertProviderOutputOptionalFinite(owner, candidate, 'fontSize', `${scenePath}.lines[${index}]`, true);
        if (candidate.fontFamily !== undefined && typeof candidate.fontFamily !== 'string')
          failProviderOutput(owner, `an invalid ${scenePath}.lines[${index}].fontFamily`);
        if (
          candidate.fontWeight !== undefined &&
          typeof candidate.fontWeight !== 'string' &&
          typeof candidate.fontWeight !== 'number'
        )
          failProviderOutput(owner, `an invalid ${scenePath}.lines[${index}].fontWeight`);

        if (typeof candidate.fontWeight === 'number')
          assertProviderOutputFinite(owner, candidate.fontWeight, `${scenePath}.lines[${index}].fontWeight`, true);
        if (candidate.fontStyle !== undefined && !Object.values(FontStyle).includes(candidate.fontStyle as never))
          failProviderOutput(owner, `an invalid ${scenePath}.lines[${index}].fontStyle`);
        if (candidate.fill !== undefined && typeof candidate.fill !== 'string')
          failProviderOutput(owner, `an invalid ${scenePath}.lines[${index}].fill`);
        assertProviderOutputUnitInterval(owner, candidate, 'opacity', `${scenePath}.lines[${index}]`);
      });

      if (value.fontFamily !== undefined && typeof value.fontFamily !== 'string')
        failProviderOutput(owner, `an invalid ${scenePath}.fontFamily`);
      if (
        value.fontWeight !== undefined &&
        typeof value.fontWeight !== 'string' &&
        typeof value.fontWeight !== 'number'
      )
        failProviderOutput(owner, `an invalid ${scenePath}.fontWeight`);

      if (typeof value.fontWeight === 'number')
        assertProviderOutputFinite(owner, value.fontWeight, `${scenePath}.fontWeight`, true);
      if (value.fontStyle !== undefined && !Object.values(FontStyle).includes(value.fontStyle as never))
        failProviderOutput(owner, `an invalid ${scenePath}.fontStyle`);
      if (!['start', 'middle', 'end'].includes(String(value.align)))
        failProviderOutput(owner, `an invalid ${scenePath}.align`);
      if (!['top', 'middle', 'bottom', 'alphabetic'].includes(String(value.baseline)))
        failProviderOutput(owner, `an invalid ${scenePath}.baseline`);
      if (value.fill !== undefined && typeof value.fill !== 'string')
        failProviderOutput(owner, `an invalid ${scenePath}.fill`);
      assertProviderOutputUnitInterval(owner, value, 'opacity', scenePath);

      return;
    }
    case 'group': {
      assertProviderOutputTransforms(owner, value.transforms, `${scenePath}.transforms`);
      if (value.clipRef !== undefined && typeof value.clipRef !== 'string')
        failProviderOutput(owner, `an invalid ${scenePath}.clipRef`);
      const children = value.children as Array<unknown>;
      if (context.active.has(value)) failProviderOutput(owner, `a cyclic ${scenePath}`);
      context.active.add(value);

      try {
        children.forEach((child, index) =>
          visitScenePrimitive(owner, child, `${scenePath}.children[${index}]`, context),
        );
      } finally {
        context.active.delete(value);
      }

      return;
    }
    default:
      failProviderOutput(owner, `an invalid Scene primitive type '${String(value.type)}'`);
  }
};

/** 在统一 fatal boundary 内物化并校验 Shape provider 发出的 Scene primitive 列表 */
export const validateScenePrimitives = (owner: string, emitted: unknown): Array<ScenePrimitive> => {
  /** 校验单个第三方 Shape primitive 的完整 Core Scene runtime contract */
  const assertValidScenePrimitive: (owner: string, primitive: unknown) => asserts primitive is ScenePrimitive = (
    providerOwner,
    primitive,
  ) => {
    visitScenePrimitive(providerOwner, primitive, 'Scene primitive', {
      active: new WeakSet(),
    });
  };

  return withProviderOutputValidationBoundary(owner, () => {
    if (
      emitted === null ||
      (typeof emitted !== 'object' && typeof emitted !== 'function') ||
      typeof (emitted as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== 'function'
    ) {
      throw createCompositeContractError(`${owner} emit must return an iterable of Scene primitives.`);
    }

    return [...(emitted as Iterable<unknown>)].map(primitive => {
      const snapshot = snapshotProviderOutputJson(owner, primitive, 'Scene primitive');
      assertValidScenePrimitive(owner, snapshot);
      return snapshot;
    });
  });
};
