import type { Position } from '@retikz/math';

import type { MarkerPrimitive, ScenePrimitive } from '../contract';

import { CompositeContractError } from '../resolve/diagnostics';
import { withProviderOutputValidationBoundary as validateProviderOutput } from '../resolve/provider-validation';
import {
  AnimationTrackSchema,
  BlendMode,
  FontStyle,
  JsonObjectSchema,
  PathCommandSchema,
  PathFillRule,
  PathLineCap,
  PathLineJoin,
} from '../schemas';

/** provider output runtime validation 使用的 marker 子集验证入口 */
export type MarkerPrimitiveValidator = (owner: string, marker: unknown) => ReadonlyArray<MarkerPrimitive>;

/** 在 provider 返回后的统一边界把未知 validation failure 分类为 fatal contract error */
export const withProviderOutputValidationBoundary = <T>(owner: string, validate: () => T): T =>
  validateProviderOutput(owner, validate);

/** 校验并脱离 provider 返回的有限二维坐标 */
export const snapshotProviderPosition = (owner: string, value: unknown): Position =>
  withProviderOutputValidationBoundary(owner, () => {
    if (!Array.isArray(value)) {
      throw new CompositeContractError(`${owner} returned an invalid position; expected a finite [x, y] tuple.`);
    }
    const length = value.length;
    const x = value[0];
    const y = value[1];
    if (length !== 2 || typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new CompositeContractError(`${owner} returned an invalid position; expected a finite [x, y] tuple.`);
    }
    return [x, y];
  });

/** 抛出带 provider owner 的 fatal output contract error */
export const failProviderOutput = (owner: string, detail: string): never => {
  throw new CompositeContractError(`${owner} emit produced ${detail}.`);
};

/** 物化 provider plain JSON 输出，并保留对象 undefined 字段供完整契约校验 */
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
        output[key] = descriptor.value === undefined ? undefined : snapshot(descriptor.value, `${currentPath}.${key}`);
      }
      return output;
    } finally {
      active.delete(objectInput);
    }
  };
  return snapshot(value, path) as T;
};

/** 从已验证且归 Core 所有的 provider snapshot 递归省略对象 undefined 字段 */
export const omitProviderOutputUndefined = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach(omitProviderOutputUndefined);
    return value;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) {
      delete record[key];
    } else {
      omitProviderOutputUndefined(record[key]);
    }
  }
  return value;
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
export const assertProviderOutputPaint = (owner: string, value: unknown, path: string, markerOnly = false): void => {
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
export const assertProviderOutputDashPattern = (owner: string, value: Record<string, unknown>, path: string): void => {
  if (value.dashPattern === undefined) return;
  providerOutputArray(owner, value.dashPattern, `${path}.dashPattern`).forEach((entry, index) =>
    assertProviderOutputFinite(owner, entry, `${path}.dashPattern[${index}]`, true),
  );
};

/** 校验 Scene/Marker 的结构化 transform 数组 */
export const assertProviderOutputTransforms = (owner: string, value: unknown, path: string): void => {
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

/** 校验 Scene/Marker 的结构化 path command 数组 */
export const assertProviderOutputPathCommands = (owner: string, value: unknown, path: string): void => {
  providerOutputArray(owner, value, path).forEach((command, index) => {
    assertProviderOutputJsonValue(owner, command, `${path}[${index}]`);
    const parsed = PathCommandSchema.safeParse(command);
    if (!parsed.success || !equalProviderOutputJson(command, parsed.data)) {
      throw new CompositeContractError(`${owner} emit produced an invalid ${path} command at index ${index}.`, {
        ...(!parsed.success ? { cause: parsed.error } : {}),
      });
    }
  });
};

/** 校验 Scene/Marker path 的 fill/stroke enum 字段 */
export const assertProviderOutputPathEnums = (owner: string, value: Record<string, unknown>, path: string): void => {
  if (value.fillRule !== undefined && !Object.values(PathFillRule).includes(value.fillRule as never)) {
    failProviderOutput(owner, `an invalid ${path}.fillRule`);
  }
  if (value.strokeLinecap !== undefined && !Object.values(PathLineCap).includes(value.strokeLinecap as never)) {
    failProviderOutput(owner, `an invalid ${path}.strokeLinecap`);
  }
  if (value.strokeLinejoin !== undefined && !Object.values(PathLineJoin).includes(value.strokeLinejoin as never)) {
    failProviderOutput(owner, `an invalid ${path}.strokeLinejoin`);
  }
};

/** 递归校验 provider value 是无函数、finite、无循环且无隐藏结构的 JSON 数据 */
const assertProviderOutputJsonValueWithActive = (
  owner: string,
  value: unknown,
  path: string,
  active: WeakSet<object>,
): void => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assertProviderOutputFinite(owner, value, path);
    return;
  }
  if (typeof value !== 'object') failProviderOutput(owner, `a non-JSON ${path}`);
  const objectValue = value as object;
  if (active.has(objectValue)) failProviderOutput(owner, `a cyclic ${path}`);
  active.add(objectValue);
  try {
    if (Array.isArray(value)) {
      providerOutputArray(owner, value, path).forEach((entry, index) =>
        assertProviderOutputJsonValueWithActive(owner, entry, `${path}[${index}]`, active),
      );
      return;
    }
    const record = providerOutputRecord(owner, value, path);
    for (const key of providerOutputOwnStringKeys(owner, record, path)) {
      assertProviderOutputJsonValueWithActive(owner, record[key], `${path}.${key}`, active);
    }
  } finally {
    active.delete(objectValue);
  }
};

/** 校验 provider value 是可无损保留的 plain JSON object graph */
export const assertProviderOutputJsonValue = (owner: string, value: unknown, path: string): void => {
  assertProviderOutputJsonValueWithActive(owner, value, path, new WeakSet());
};

/** 比较两棵已验证 JSON tree 的值和全部 key 是否完全一致 */
const equalProviderOutputJson = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((entry, index) => equalProviderOutputJson(entry, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Reflect.ownKeys(leftRecord);
  const rightKeys = Reflect.ownKeys(rightRecord);
  if (leftKeys.length !== rightKeys.length || leftKeys.some(key => typeof key !== 'string')) return false;
  return leftKeys.every(
    key =>
      typeof key === 'string' &&
      Object.prototype.hasOwnProperty.call(rightRecord, key) &&
      equalProviderOutputJson(leftRecord[key], rightRecord[key]),
  );
};

/** 先验证原始 JSON graph，再验证 schema 且拒绝任何 schema stripping */
const assertJsonSchema = (owner: string, value: unknown, path: string, schema: typeof JsonObjectSchema): void => {
  assertProviderOutputJsonValue(owner, value, path);
  const parsed = schema.safeParse(value);
  if (!parsed.success || !equalProviderOutputJson(value, parsed.data)) failProviderOutput(owner, `an invalid ${path}`);
};

/** 校验动画 track 原始对象图与 AnimationTrackSchema 完全一致 */
const assertAnimationTrack = (owner: string, value: unknown, path: string): void => {
  assertProviderOutputJsonValue(owner, value, path);
  const parsed = AnimationTrackSchema.safeParse(value);
  if (!parsed.success || !equalProviderOutputJson(value, parsed.data)) {
    failProviderOutput(owner, `an invalid ${path}`);
  }
};

/** 校验 Scene primitive 的共享 id/meta/animations 字段 */
const assertSceneCommon = (owner: string, value: Record<string, unknown>, path: string): void => {
  if (value.id !== undefined && typeof value.id !== 'string') failProviderOutput(owner, `an invalid ${path}.id`);
  if (value.meta !== undefined) assertJsonSchema(owner, value.meta, `${path}.meta`, JsonObjectSchema);
  if (value.animations !== undefined) {
    providerOutputArray(owner, value.animations, `${path}.animations`).forEach((track, index) =>
      assertAnimationTrack(owner, track, `${path}.animations[${index}]`),
    );
  }
};

/** 校验 Scene resolved shadow 的 required 字段与范围 */
const assertResolvedShadow = (owner: string, value: unknown, path: string): void => {
  if (value === undefined) return;
  const shadow = providerOutputRecord(owner, value, path);
  assertProviderOutputKeys(owner, shadow, ['offsetX', 'offsetY', 'blur', 'color', 'opacity'], path);
  assertProviderOutputFinite(owner, shadow.offsetX, `${path}.offsetX`);
  assertProviderOutputFinite(owner, shadow.offsetY, `${path}.offsetY`);
  if (typeof shadow.color !== 'string') failProviderOutput(owner, `an invalid ${path}.color`);
  assertProviderOutputOptionalFinite(owner, shadow, 'blur', path, true);
  assertProviderOutputUnitInterval(owner, shadow, 'opacity', path);
};

/** 校验 Scene geometry primitive 的共享 paint/style 字段 */
const assertSceneStyle = (owner: string, value: Record<string, unknown>, path: string): void => {
  assertProviderOutputPaint(owner, value.fill, `${path}.fill`);
  assertProviderOutputPaint(owner, value.stroke, `${path}.stroke`);
  assertProviderOutputUnitInterval(owner, value, 'fillOpacity', path);
  assertProviderOutputUnitInterval(owner, value, 'strokeOpacity', path);
  assertProviderOutputUnitInterval(owner, value, 'opacity', path);
  assertProviderOutputOptionalFinite(owner, value, 'strokeWidth', path, true);
  assertProviderOutputOptionalFinite(owner, value, 'dashOffset', path);
  assertProviderOutputDashPattern(owner, value, path);
  if (value.blendMode !== undefined && !Object.values(BlendMode).includes(value.blendMode as never)) {
    failProviderOutput(owner, `an invalid ${path}.blendMode`);
  }
  assertResolvedShadow(owner, value.shadow, `${path}.shadow`);
};

/** Scene recursive validation 所需的 active-path 与 Marker 子集入口 */
type SceneValidationContext = Readonly<{
  active: WeakSet<object>;
  validateMarkerPrimitives: MarkerPrimitiveValidator;
}>;

/** 递归校验单个 Scene primitive 并沿当前 group 路径检测循环 */
const visitScenePrimitive = (
  owner: string,
  primitive: unknown,
  path: string,
  context: SceneValidationContext,
): void => {
  const value = providerOutputRecord(owner, primitive, path);
  const commonFields = ['type', 'id', 'meta', 'animations'];
  switch (value.type) {
    case 'rect':
      assertProviderOutputKeys(
        owner,
        value,
        [
          ...commonFields,
          'x',
          'y',
          'width',
          'height',
          'fill',
          'fillOpacity',
          'stroke',
          'strokeOpacity',
          'strokeWidth',
          'dashPattern',
          'dashOffset',
          'cornerRadius',
          'opacity',
          'shadow',
          'blendMode',
        ],
        path,
      );
      assertSceneCommon(owner, value, path);
      assertProviderOutputFinite(owner, value.x, `${path}.x`);
      assertProviderOutputFinite(owner, value.y, `${path}.y`);
      assertProviderOutputFinite(owner, value.width, `${path}.width`, true);
      assertProviderOutputFinite(owner, value.height, `${path}.height`, true);
      assertProviderOutputOptionalFinite(owner, value, 'cornerRadius', path, true);
      assertSceneStyle(owner, value, path);
      return;
    case 'ellipse':
      assertProviderOutputKeys(
        owner,
        value,
        [
          ...commonFields,
          'cx',
          'cy',
          'rx',
          'ry',
          'rotate',
          'fill',
          'fillOpacity',
          'stroke',
          'strokeOpacity',
          'strokeWidth',
          'dashPattern',
          'dashOffset',
          'opacity',
          'shadow',
          'blendMode',
        ],
        path,
      );
      assertSceneCommon(owner, value, path);
      assertProviderOutputFinite(owner, value.cx, `${path}.cx`);
      assertProviderOutputFinite(owner, value.cy, `${path}.cy`);
      assertProviderOutputFinite(owner, value.rx, `${path}.rx`, true);
      assertProviderOutputFinite(owner, value.ry, `${path}.ry`, true);
      assertProviderOutputOptionalFinite(owner, value, 'rotate', path);
      assertSceneStyle(owner, value, path);
      return;
    case 'path': {
      assertProviderOutputKeys(
        owner,
        value,
        [
          ...commonFields,
          'commands',
          'fill',
          'fillOpacity',
          'fillRule',
          'stroke',
          'strokeOpacity',
          'strokeWidth',
          'dashPattern',
          'dashOffset',
          'strokeLinecap',
          'strokeLinejoin',
          'arrowStart',
          'arrowEnd',
          'opacity',
          'shadow',
          'blendMode',
        ],
        path,
      );
      assertSceneCommon(owner, value, path);
      assertProviderOutputPathCommands(owner, value.commands, `${path}.commands`);
      assertProviderOutputPathEnums(owner, value, path);
      for (const field of ['arrowStart', 'arrowEnd'] as const) {
        if (value[field] === undefined) continue;
        const arrow = providerOutputRecord(owner, value[field], `${path}.${field}`);
        assertProviderOutputKeys(
          owner,
          arrow,
          ['shape', 'baseSize', 'refX', 'markerWidth', 'markerHeight', 'opacity', 'marker'],
          `${path}.${field}`,
        );
        if (typeof arrow.shape !== 'string') failProviderOutput(owner, `an invalid ${path}.${field}.shape`);
        assertProviderOutputFinite(owner, arrow.baseSize, `${path}.${field}.baseSize`, true);
        assertProviderOutputFinite(owner, arrow.refX, `${path}.${field}.refX`);
        assertProviderOutputFinite(owner, arrow.markerWidth, `${path}.${field}.markerWidth`, true);
        assertProviderOutputFinite(owner, arrow.markerHeight, `${path}.${field}.markerHeight`, true);
        assertProviderOutputUnitInterval(owner, arrow, 'opacity', `${path}.${field}`);
        const marker = providerOutputArray(owner, arrow.marker, `${path}.${field}.marker`);
        context.validateMarkerPrimitives(`${owner} ${field}`, marker);
      }
      assertSceneStyle(owner, value, path);
      return;
    }
    case 'text': {
      assertProviderOutputKeys(
        owner,
        value,
        [
          ...commonFields,
          'x',
          'y',
          'lines',
          'fontSize',
          'fontFamily',
          'fontWeight',
          'fontStyle',
          'align',
          'baseline',
          'lineHeight',
          'measuredWidth',
          'measuredHeight',
          'fill',
          'opacity',
        ],
        path,
      );
      assertSceneCommon(owner, value, path);
      assertProviderOutputFinite(owner, value.x, `${path}.x`);
      assertProviderOutputFinite(owner, value.y, `${path}.y`);
      assertProviderOutputFinite(owner, value.fontSize, `${path}.fontSize`, true);
      assertProviderOutputFinite(owner, value.lineHeight, `${path}.lineHeight`, true);
      assertProviderOutputFinite(owner, value.measuredWidth, `${path}.measuredWidth`, true);
      assertProviderOutputFinite(owner, value.measuredHeight, `${path}.measuredHeight`, true);
      const lines = providerOutputArray(owner, value.lines, `${path}.lines`);
      if (lines.length === 0) failProviderOutput(owner, `an invalid ${path}.lines`);
      lines.forEach((line, index) => {
        const candidate = providerOutputRecord(owner, line, `${path}.lines[${index}]`);
        assertProviderOutputKeys(
          owner,
          candidate,
          ['text', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'fill', 'opacity'],
          `${path}.lines[${index}]`,
        );
        if (typeof candidate.text !== 'string') failProviderOutput(owner, `an invalid ${path}.lines[${index}].text`);
        assertProviderOutputOptionalFinite(owner, candidate, 'fontSize', `${path}.lines[${index}]`, true);
        if (candidate.fontFamily !== undefined && typeof candidate.fontFamily !== 'string')
          failProviderOutput(owner, `an invalid ${path}.lines[${index}].fontFamily`);
        if (
          candidate.fontWeight !== undefined &&
          typeof candidate.fontWeight !== 'string' &&
          typeof candidate.fontWeight !== 'number'
        )
          failProviderOutput(owner, `an invalid ${path}.lines[${index}].fontWeight`);
        if (typeof candidate.fontWeight === 'number')
          assertProviderOutputFinite(owner, candidate.fontWeight, `${path}.lines[${index}].fontWeight`, true);
        if (candidate.fontStyle !== undefined && !Object.values(FontStyle).includes(candidate.fontStyle as never))
          failProviderOutput(owner, `an invalid ${path}.lines[${index}].fontStyle`);
        if (candidate.fill !== undefined && typeof candidate.fill !== 'string')
          failProviderOutput(owner, `an invalid ${path}.lines[${index}].fill`);
        assertProviderOutputUnitInterval(owner, candidate, 'opacity', `${path}.lines[${index}]`);
      });
      if (value.fontFamily !== undefined && typeof value.fontFamily !== 'string')
        failProviderOutput(owner, `an invalid ${path}.fontFamily`);
      if (
        value.fontWeight !== undefined &&
        typeof value.fontWeight !== 'string' &&
        typeof value.fontWeight !== 'number'
      )
        failProviderOutput(owner, `an invalid ${path}.fontWeight`);
      if (typeof value.fontWeight === 'number')
        assertProviderOutputFinite(owner, value.fontWeight, `${path}.fontWeight`, true);
      if (value.fontStyle !== undefined && !Object.values(FontStyle).includes(value.fontStyle as never))
        failProviderOutput(owner, `an invalid ${path}.fontStyle`);
      if (!['start', 'middle', 'end'].includes(String(value.align)))
        failProviderOutput(owner, `an invalid ${path}.align`);
      if (!['top', 'middle', 'bottom', 'alphabetic'].includes(String(value.baseline)))
        failProviderOutput(owner, `an invalid ${path}.baseline`);
      if (value.fill !== undefined && typeof value.fill !== 'string')
        failProviderOutput(owner, `an invalid ${path}.fill`);
      assertProviderOutputUnitInterval(owner, value, 'opacity', path);
      return;
    }
    case 'group': {
      assertProviderOutputKeys(owner, value, [...commonFields, 'transforms', 'clipRef', 'children'], path);
      assertSceneCommon(owner, value, path);
      assertProviderOutputTransforms(owner, value.transforms, `${path}.transforms`);
      if (value.clipRef !== undefined && typeof value.clipRef !== 'string')
        failProviderOutput(owner, `an invalid ${path}.clipRef`);
      const children = providerOutputArray(owner, value.children, `${path}.children`);
      if (context.active.has(value)) failProviderOutput(owner, `a cyclic ${path}`);
      context.active.add(value);
      try {
        children.forEach((child, index) => visitScenePrimitive(owner, child, `${path}.children[${index}]`, context));
      } finally {
        context.active.delete(value);
      }
      return;
    }
    default:
      failProviderOutput(owner, `an invalid Scene primitive type '${String(value.type)}'`);
  }
};

/** 校验单个第三方 Shape primitive 的完整 Core Scene runtime contract */
const assertValidScenePrimitive: (
  owner: string,
  primitive: unknown,
  validateMarkerPrimitives: MarkerPrimitiveValidator,
) => asserts primitive is ScenePrimitive = (owner, primitive, validateMarkerPrimitives) => {
  visitScenePrimitive(owner, primitive, 'Scene primitive', {
    active: new WeakSet(),
    validateMarkerPrimitives,
  });
};

/** 在统一 fatal boundary 内物化并校验 Shape provider 发出的 Scene primitive 列表 */
export const validateScenePrimitives = (
  owner: string,
  emitted: unknown,
  validateMarkerPrimitives: MarkerPrimitiveValidator,
): Array<ScenePrimitive> =>
  withProviderOutputValidationBoundary(owner, () => {
    if (
      emitted === null ||
      (typeof emitted !== 'object' && typeof emitted !== 'function') ||
      typeof (emitted as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== 'function'
    ) {
      throw new CompositeContractError(`${owner} emit must return an iterable of Scene primitives.`);
    }
    return [...(emitted as Iterable<unknown>)].map(primitive => {
      const snapshot = snapshotProviderOutputJson(owner, primitive, 'Scene primitive');
      assertValidScenePrimitive(owner, snapshot, validateMarkerPrimitives);
      return omitProviderOutputUndefined(snapshot);
    });
  });
