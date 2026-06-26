import { JsonObjectSchema } from '@retikz/core';
import { type AnyScaleDefinition, type ChannelResolveContext, type ChannelScaleResolution, type PositionScale, extractScaleType, isBuiltinScaleOperation } from '../../contract';
import { type MarkOperation, PathClosureKind, PlotFieldType, type PlotFieldTypeValue, PlotMark, PlotScale, type Scale, type ScaleOperation, isBuiltinMark } from '../../schemas';
import { COLOR_SCALE_DEFINITIONS, POSITION_SCALE_DEFINITIONS } from './features';

/**
 * 内置 scale definition 列表（position 9 + channel 6 = 15）。
 * @description 按 family 分族登记（position 产坐标 / channel 产颜色，对齐 contract 的 family 判别）；与自定义 scale 共享同一 registry 分派流程。
 */
export const BUILTIN_SCALES: ReadonlyArray<AnyScaleDefinition> = [...POSITION_SCALE_DEFINITIONS, ...COLOR_SCALE_DEFINITIONS];

/**
 * 解析 scale registry。
 * @description 内置 scale 总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。
 */
export const resolveScaleRegistry = (custom?: ReadonlyArray<AnyScaleDefinition>): Map<string, AnyScaleDefinition> => {
  const registry = new Map<string, AnyScaleDefinition>();
  for (const def of BUILTIN_SCALES) {
    registry.set(extractScaleType(def.schema), def);
  }
  for (const def of custom ?? []) {
    const type = extractScaleType(def.schema);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate scale registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};

const scaleDefinitionOf = (operation: ScaleOperation, registry: ReadonlyMap<string, AnyScaleDefinition>): AnyScaleDefinition => {
  const def = registry.get(operation.type);
  if (def === undefined) {
    throw new Error(`lowerPlots: scale type "${operation.type}" is not registered; pass a ScaleDefinition via options.scaleDefinitions`);
  }
  return def;
};

/**
 * 解析并校验单个 scale operation；返回可安全喂给 definition 的宽类型。
 * @description 内置 op 已是精确 Scale 形态（PlotSpecSchema 静态校验 + resolve* 运行时深校验，如 finite domain / 升序断点），
 *   直接透传以保留信息化错误；自定义 op 才用 definition.schema 深解析 + JSON 可序列化双校验。
 */
const parseScaleOperation = (def: AnyScaleDefinition, operation: ScaleOperation): never => {
  if (isBuiltinScaleOperation(operation)) return operation as never;
  JsonObjectSchema.parse(operation);
  const parsed = def.schema.parse(operation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/**
 * 据 scale operation 建对应 PositionScale（registry 分派，family='position'）。
 * @description channel scale 作位置通道 → fail-loud（color scale 只绑 color 通道）。
 */
export const resolvePositionScale = (
  operation: ScaleOperation,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
  registry: ReadonlyMap<string, AnyScaleDefinition>,
): PositionScale => {
  const def = scaleDefinitionOf(operation, registry);
  if (def.family !== 'position') {
    throw new Error(`resolvePositionScale: ${operation.type} scale "${operation.name}" cannot drive a positional (x/y) channel; color scales bind the color channel only`);
  }
  return def.resolve(parseScaleOperation(def, operation), values, fallbackRange);
};

/**
 * 据 scale operation 建 channel 解析（registry 分派，family='channel'）。
 * @description position scale 作 color 通道 → fail-loud。fieldType 不兼容 → fail-loud（连续字段须连续 / 离散化色阶，分类字段须 ordinal）。
 */
export const resolveChannelScale = (
  operation: ScaleOperation,
  values: Array<unknown>,
  ctx: ChannelResolveContext,
  registry: ReadonlyMap<string, AnyScaleDefinition>,
  options: { checkFieldCompatible?: boolean } = {},
): ChannelScaleResolution => {
  const def = scaleDefinitionOf(operation, registry);
  if (def.family !== 'channel') {
    throw new Error(`lowerPlots: scale "${operation.name}" of type "${operation.type}" is not a color scale (color channels bind ordinal / sequential / diverging / quantize / threshold / quantile)`);
  }
  // 字段绑定（mark 取色）强制 fieldType 兼容；legend 只渲 scale 外观、不绑字段，跳过该校验。
  if (options.checkFieldCompatible !== false && !def.isFieldCompatible(ctx.fieldType)) {
    throw new Error(`lowerPlots: color scale "${operation.name}" (${operation.type}) is incompatible with a ${ctx.fieldType ?? 'untyped'} field`);
  }
  return def.resolve(parseScaleOperation(def, operation), values, ctx);
};

/**
 * 类型 ↔ scale 兼容校验（fail-loud，不强转）：position 族经 registry 的 isFieldCompatible 谓词判定。
 * @description 仅对 position 族 scale 生效；channel scale 作位置通道由 resolvePositionScale fail-loud。
 */
export const assertScaleFieldCompatible = (
  role: string,
  scaleType: string,
  fieldType: PlotFieldTypeValue,
  scaleName: string,
  registry: ReadonlyMap<string, AnyScaleDefinition>,
): void => {
  const def = registry.get(scaleType);
  if (def === undefined || def.family !== 'position') return;
  if (!def.isFieldCompatible(fieldType)) {
    throw new Error(`lowerPlots: coordinate.${role} scale "${scaleName}" (${scaleType}) is incompatible with ${fieldType} field`);
  }
};

/**
 * 值轴 baseline 兼容校验（fail-loud）：position 族 allowsBaseline=false 的 scale 不能作 interval / area 值轴。
 * @description 柱 / 面积 baseline 含 0，与 log/pow/sqrt 结构冲突（log(0)=-∞）；仅查值轴（cartesian=y、polar=radius）。
 */
export const assertBaselineScaleCompatible = (
  valueScaleType: string,
  marks: ReadonlyArray<MarkOperation>,
  registry: ReadonlyMap<string, AnyScaleDefinition>,
): void => {
  const def = registry.get(valueScaleType);
  if (def === undefined || def.family !== 'position' || def.allowsBaseline !== false) return;
  const hasBaselineMark = marks.some(mark =>
    isBuiltinMark(mark) &&
    (mark.type === PlotMark.Interval ||
      (mark.type === PlotMark.Path && (mark.closure?.kind === PathClosureKind.Baseline || mark.closure?.kind === PathClosureKind.Stack))),
  );
  if (hasBaselineMark) {
    throw new Error(
      `nonlinear continuous scale (${valueScaleType}) cannot be used with interval/area/path closure because their baseline participates in the value axis; use a linear value scale or an open point/line mark`,
    );
  }
};

/**
 * 按字段类型派生默认位置 scale 定义（type-driven 选型）
 * @description continuous→linear、temporal→time、categorical→band；
 *   undefined（无字段绑定，如全常量通道）→ linear 兜底。仅在 coordinate 省略 scale 绑定时调用。
 */
export const deriveScale = (fieldType: PlotFieldTypeValue | undefined, name: string): Scale => {
  switch (fieldType) {
    case PlotFieldType.Temporal:
      return { type: PlotScale.Time, name };
    case PlotFieldType.Categorical:
      return { type: PlotScale.Band, name };
    default:
      return { type: PlotScale.Linear, name };
  }
};
