import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject } from 'zod';

import { RetikzDataError } from '../../error';
import type { IRRegressionMethod } from './schema';

/** 有限数值观测 */
export type RegressionPair = Readonly<{
  /** 自变量 */
  x: number;
  /** 因变量 */
  y: number;
}>;

/** 拟合模型；仅用于运行时预测 */
export type RegressionModel = Readonly<{
  /** 在数据空间预测 y */
  predict: (x: number) => number;
}>;

/** 当前组拟合请求；预测域不进入持久化模型 */
export type RegressionFitOptions = Readonly<{
  /** 当前组最终预测域 */
  extent?: readonly [number, number];
}>;

/** 已准备的组合拟合依赖；同步入口只注入同步回调 */
export type RegressionFitContext<TModel = RegressionModel | Promise<RegressionModel>> = RegressionFitOptions &
  Readonly<{
    /** 按 Definition 声明顺序拟合一个依赖，继承当前预测域 */
    fitRegression: (index: number, pairs: ReadonlyArray<RegressionPair>) => TModel;
  }>;

/** 不含执行状态的拟合依赖树 */
export type RegressionDependency = Readonly<{
  /** Data 计算依赖类别 */
  type: 'regression';
  /** 精确解析后的方法声明 */
  operation: IRRegressionMethod;
  /** 本次请求的语义身份 */
  definition: AnyRegressionDefinition;
  /** 保留候选顺序的传递依赖 */
  dependencies: ReadonlyArray<RegressionDependency>;
}>;

/**
 * 内置与外部拟合共享的运行时契约
 * @template TSource 拟合方法 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致
 */
export type RegressionDefinition<TSource extends IRRegressionMethod = IRRegressionMethod, TOperation = TSource> = {
  /** 精确参数 schema，kind 必须是非空字面量 */
  schema: ZodType<TOperation, TSource>;
  /** 从精确参数声明有序拟合依赖，不读取观测 */
  dependencies?: (operation: TOperation) => ReadonlyArray<IRRegressionMethod>;
  /** 方法专有预测域约束 */
  validateExtent?: (operation: TOperation, extent: readonly [number, number]) => void;
};

/**
 * 保留 schema 与回调的参数推断
 * @template TSource 拟合方法 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致
 * @param definition 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
 */
export const defineRegression = <TSource extends IRRegressionMethod, TOperation = TSource>(
  definition: RegressionDefinition<TSource, TOperation>,
): RegressionDefinition<TSource, TOperation> => definition;

/** registry 擦除不同方法的参数泛型；调用前必须精确解析 */
export type AnyRegressionDefinition = {
  /** 精确参数 schema */
  schema: ZodType;
  /** 已解析参数对应的有序依赖 */
  dependencies?: (operation: never) => ReadonlyArray<IRRegressionMethod>;
  /** 已解析参数的预测域校验 */
  validateExtent?: (operation: never, extent: readonly [number, number]) => void;
};

/** 同步拟合计算；依赖回调只返回模型 */
type SynchronousRegressionFit<TOperation> = (
  pairs: ReadonlyArray<RegressionPair>,
  operation: TOperation,
  context: RegressionFitContext<RegressionModel>,
) => RegressionModel;

/** 异步拟合计算；允许等待声明的依赖 */
type AsynchronousRegressionFit<TOperation> = (
  pairs: ReadonlyArray<RegressionPair>,
  operation: TOperation,
  context: RegressionFitContext,
) => RegressionModel | Promise<RegressionModel>;

/** 至少提供一种计算能力；双入口复用同一语义身份 */
type RegressionComputation<TOperation> =
  | Readonly<{
      /** 同步入口；整个依赖树必须具有同步能力 */
      fit: SynchronousRegressionFit<TOperation>;
      /** 异步入口；省略时异步执行器复用完整同步依赖树 */
      fitAsync?: AsynchronousRegressionFit<TOperation>;
    }>
  | Readonly<{
      /** 未提供同步能力时不可进入同步执行集合 */
      fit?: SynchronousRegressionFit<TOperation>;
      /** 异步入口；依赖可以是同步或异步实现 */
      fitAsync: AsynchronousRegressionFit<TOperation>;
    }>;

/**
 * 拟合的独立计算实现，显式声明同步与异步能力
 * @template TSource 方法 schema 接受的声明类型
 * @template TOperation 精确解析后的参数类型
 */
export type RegressionImplementation<
  TSource extends IRRegressionMethod = IRRegressionMethod,
  TOperation = TSource,
> = Readonly<{
  /** 同一方法的唯一语义身份 */
  definition: RegressionDefinition<TSource, TOperation>;
}> &
  RegressionComputation<TOperation>;

/**
 * 保留同步入口与精确方法参数的关联
 * @template TSource 方法 schema 接受的声明类型
 * @template TOperation 精确解析后的参数类型
 * @param implementation 具备同步能力的计算实现；不会自动注册
 * @returns 原样返回实现，保留必有同步入口的类型
 */
export function defineRegressionImplementation<TSource extends IRRegressionMethod, TOperation>(
  implementation: RegressionImplementation<TSource, TOperation> & { fit: SynchronousRegressionFit<TOperation> },
): RegressionImplementation<TSource, TOperation> & { fit: SynchronousRegressionFit<TOperation> };
/**
 * 保留异步入口与精确方法参数的关联
 * @template TSource 方法 schema 接受的声明类型
 * @template TOperation 精确解析后的参数类型
 * @param implementation 具备异步能力的计算实现；不会自动注册
 * @returns 原样返回实现，不推断或探测同步能力
 */
export function defineRegressionImplementation<TSource extends IRRegressionMethod, TOperation>(
  implementation: RegressionImplementation<TSource, TOperation>,
): RegressionImplementation<TSource, TOperation>;
export function defineRegressionImplementation<TSource extends IRRegressionMethod, TOperation>(
  implementation: RegressionImplementation<TSource, TOperation>,
): RegressionImplementation<TSource, TOperation> {
  return implementation;
}

/** 异构拟合计算注册项；调用前必须精确解析参数 */
export type AnyRegressionImplementation = Readonly<{
  /** 唯一拟合语义身份 */
  definition: AnyRegressionDefinition;
}> &
  RegressionComputation<never>;

/** 同步拟合入口要求显式提供 fit，不接受仅有 fitAsync 的实现 */
export type AnySynchronousRegressionImplementation = Readonly<{
  /** 唯一拟合语义身份 */
  definition: AnyRegressionDefinition;
  /** 不返回 Promise 的拟合 */
  fit: SynchronousRegressionFit<never>;
  /** 可选异步能力；同步执行不会调用此入口 */
  fitAsync?: AsynchronousRegressionFit<never>;
}>;

/**
 * 从 Definition 提取唯一注册键
 * @param schema 注册定义的对象 schema，kind 必须是非空字符串字面量
 * @returns kind 字面量的字符串值
 * @throws {RetikzDataError} schema 不是对象或 kind 不是有效字面量
 */
export const extractRegressionKind = (schema: ZodType): string => {
  if (!(schema instanceof ZodObject))
    throw new RetikzDataError('data: regression schema must be an object with a literal kind');

  const kind = schema.shape.kind;
  if (!(kind instanceof ZodLiteral) || typeof kind.value !== 'string' || kind.value.trim().length === 0)
    throw new RetikzDataError('data: regression kind must be a non-blank literal');

  return kind.value;
};

/** 一次精确解析后的拟合入口，不进入 IR */
export type RegressionResolution = Readonly<{
  /** 拟合当前组，返回已包装异常与非有限值诊断的模型 */
  fit: (pairs: ReadonlyArray<RegressionPair>, options?: RegressionFitOptions) => RegressionModel;
  /** 校验当前预测域 */
  validateExtent: (extent: readonly [number, number]) => void;
}>;
