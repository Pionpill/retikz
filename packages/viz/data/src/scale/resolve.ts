import { RetikzDataError } from '../error';
import { BUILTIN_SCALES } from './builtins';
import type { ScaleDefinition, ScaleResolution, ScaleResolveContext } from './contract';
import { ScaleOperationSchema } from './schema';
import type { IRDataScaleOperation } from './schema';

/** 合并内置与自定义数学定义，禁止重复注册 */
export const resolveScaleRegistry = (
  definitions: ReadonlyArray<ScaleDefinition> = [],
): ReadonlyMap<string, ScaleDefinition> => {
  const registry = new Map<string, ScaleDefinition>();
  for (const definition of [...BUILTIN_SCALES, ...definitions]) {
    if (registry.has(definition.type)) throw new RetikzDataError(`duplicate scale type: ${definition.type}`);
    registry.set(definition.type, definition);
  }
  return registry;
};

const builtinRegistry = resolveScaleRegistry();

/** 将第三方延迟回调异常归入 Data 边界，同时保留动态数学结果 */
const protectScaleResolution = (resolution: ScaleResolution, type: string): ScaleResolution => {
  const invoke = <TResult>(callback: () => TResult): TResult => {
    try {
      return callback();
    } catch (cause) {
      if (cause instanceof RetikzDataError) throw cause;
      throw new RetikzDataError(`scale evaluation failed: ${type}`, { cause });
    }
  };

  const { ticks, invert, rebuild } = resolution;

  return {
    map: value => invoke(() => resolution.map(value)),
    get domain() {
      return invoke(() => resolution.domain);
    },
    get range() {
      return invoke(() => resolution.range);
    },
    ticks: ticks === undefined ? undefined : count => invoke(() => ticks(count)),
    invert: invert === undefined ? undefined : value => invoke(() => invert(value)),
    rebuild:
      rebuild === undefined ? undefined : options => invoke(() => protectScaleResolution(rebuild(options), type)),
    get bandwidth() {
      return invoke(() => resolution.bandwidth);
    },
    get step() {
      return invoke(() => resolution.step);
    },
    get thresholds() {
      return invoke(() => resolution.thresholds);
    },
  };
};

/** 在外部输入边界解析公共声明与注册参数，内部消费不重复解析 */
export const parseScaleOperation = (
  input: unknown,
  registry: ReadonlyMap<string, ScaleDefinition> = builtinRegistry,
): IRDataScaleOperation => {
  try {
    const operation = ScaleOperationSchema.parse(input);
    const definition = registry.get(operation.type);
    if (definition === undefined) throw new RetikzDataError(`unregistered scale type: ${operation.type}`);
    return { ...operation, params: definition.paramsSchema.parse(operation.params ?? {}) };
  } catch (cause) {
    if (cause instanceof RetikzDataError) throw cause;
    throw new RetikzDataError('invalid scale operation', { cause });
  }
};

/**
 * 从已类型化声明建立数学映射，宿主负责样本与默认策略选择
 * @param operation 映射声明
 * @param context 可选运行时输入；省略 values 等同空样本，定义回调始终收到数组
 * @param registry 映射定义注册表，省略时使用内置定义
 * @returns 独立的数学映射与算法结果
 */
export const resolveScale = (
  operation: IRDataScaleOperation,
  context: Partial<ScaleResolveContext> = {},
  registry: ReadonlyMap<string, ScaleDefinition> = builtinRegistry,
): ScaleResolution => {
  const definition = registry.get(operation.type);
  if (definition === undefined) throw new RetikzDataError(`unregistered scale type: ${operation.type}`);
  try {
    return protectScaleResolution(
      definition.resolve(
        {
          ...context,
          values: context.values ?? [],
          domain: operation.domain ?? context.domain,
          range: operation.range ?? context.range,
        },
        operation.params ?? {},
      ),
      operation.type,
    );
  } catch (cause) {
    if (cause instanceof RetikzDataError) throw cause;
    throw new RetikzDataError(`scale resolution failed: ${operation.type}`, { cause });
  }
};
