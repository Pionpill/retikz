import { RetikzDataError } from '../error';
import type { DataTransformResult } from '../model';
import type { AnyTransformImplementation, DataTransformResolution } from '../transform';
import { BUILTIN_TRANSFORM_IMPLEMENTATIONS, extractTransformKind } from '../transform';
import type {
  DataTransformExecutionOptions,
  DataTransformExecutor,
  DataTransformInputDescriptor,
  DataTransformPreparation,
  DataTransformRequestOptions,
  DataTransformStageImplementation,
  InputDataTransformStage,
  DataTransformStageSupport,
  DataTransformImplementationProvider,
} from './contract';
import { createLocalTransformPreparation } from './local';
import { resolveDataExecution } from './policy';
import { PreparedTransformPlan } from './prepared-plan';
import { assertDataTransformModel, assertDataExecutionActive, hasDataProvenance } from './result';

/**
 * 将实际输入投影为无行数据的能力描述
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 * @param input 实际源输入或计算结果
 * @returns 保留源句柄或结果模型的预检描述，不读取或复制行数据
 */
export const describeDataTransformInput = <TSource>(
  input: InputDataTransformStage<TSource>,
): DataTransformInputDescriptor<TSource> =>
  input.kind === 'source' ? input : { kind: 'result', model: input.result.model };

/** 复用注册环境；请求计划与执行状态由独立实例持有 */
class TransformExecutor<TSource> implements DataTransformExecutor<TSource> {
  private readonly providers = new Map<string, DataTransformImplementationProvider<TSource>>();
  private readonly implementations = new Map<string, AnyTransformImplementation>();

  constructor(private readonly options: DataTransformExecutionOptions<TSource>) {
    for (const registration of options.externalProviders ?? []) {
      if (this.providers.has(registration.name))
        throw new RetikzDataError(`data: duplicate external provider "${registration.name}"`);
      this.providers.set(registration.name, registration.provider);
    }

    for (const implementation of [...BUILTIN_TRANSFORM_IMPLEMENTATIONS, ...(options.transformImplementations ?? [])]) {
      const kind = extractTransformKind(implementation.definition.schema);
      if (this.implementations.has(kind))
        throw new RetikzDataError(`data: duplicate implementation registration: "${kind}"`);
      this.implementations.set(kind, implementation);
    }
  }

  /** 固定本请求的全部阶段选择；预检期间不执行数据计算 */
  prepare = async (
    descriptor: DataTransformInputDescriptor<TSource>,
    resolution: DataTransformResolution,
    request: DataTransformRequestOptions = {},
  ): Promise<DataTransformPreparation<TSource>> => {
    assertDataExecutionActive(request.signal);
    assertDataTransformModel(resolution.inputModel, descriptor.model);
    const options = this.options;
    const selected: Array<DataTransformStageImplementation<TSource>> = [];
    const localStages = new Set<number>();
    const plan = new PreparedTransformPlan(
      descriptor,
      resolution,
      request,
      options.materializeSource,
      selected,
      localStages,
    );
    const requirements = plan.requirements;
    let prepareLocal: ReturnType<typeof createLocalTransformPreparation<TSource>> | undefined;
    let inputDescriptor = descriptor;
    for (const [operationIndex, stage] of resolution.stages.entries()) {
      assertDataExecutionActive(request.signal);
      const policy = resolveDataExecution(options.dataExecution, request.dataExecution, stage.dataExecution);
      let support: DataTransformStageSupport<TSource> | undefined;
      if (policy.mode !== 'builtin') {
        const provider = policy.external === undefined ? undefined : this.providers.get(policy.external);
        if (provider === undefined)
          throw new RetikzDataError(`data: external provider "${policy.external ?? ''}" is not registered`, {
            operationIndex,
          });

        try {
          support = await provider.resolve(stage, {
            operationIndex,
            input: inputDescriptor,
            requirements,
            signal: request.signal,
          });
        } catch (cause) {
          throw new RetikzDataError(`data: capability query failed at index ${operationIndex}`, {
            cause,
            operationIndex,
          });
        }

        assertDataExecutionActive(request.signal);
        if (support.kind === 'unsupported' && support.diagnostics.length === 0)
          throw new RetikzDataError('data: unsupported provider must return diagnostics', { operationIndex });
        if (support.kind === 'unsupported' && policy.mode === 'external') return support;
      }

      if (support === undefined || support.kind === 'unsupported') {
        const implementation = this.implementations.get(stage.operation.kind);
        if (implementation === undefined)
          return {
            kind: 'unsupported',
            diagnostics: [
              {
                code: 'NO_LOCAL_IMPLEMENTATION',
                operationIndex,
                message: `data: "${stage.operation.kind}" has no local implementation`,
              },
            ],
          };

        if (implementation.definition !== stage.definition)
          throw new RetikzDataError(
            `data: implementation "${stage.operation.kind}" references a different Definition`,
            { operationIndex },
          );

        const local = (prepareLocal ??= createLocalTransformPreparation(options, this.implementations))(stage);
        if (local === undefined)
          return {
            kind: 'unsupported',
            diagnostics: [
              {
                code: 'NO_LOCAL_DEPENDENCY',
                operationIndex,
                message: `data: "${stage.operation.kind}" has no local implementation for all dependencies`,
              },
            ],
          };

        if (inputDescriptor.kind === 'source' && options.materializeSource === undefined)
          return {
            kind: 'unsupported',
            diagnostics: [
              {
                code: 'NO_MATERIALIZER',
                operationIndex,
                message: 'data: native source requires materializeSource for local execution',
              },
            ],
          };

        localStages.add(operationIndex);
        support = {
          kind: 'supported',
          implementation: plan.bindLocalStage(stage, operationIndex, local),
        };
      }

      if (support.implementation.definition !== stage.definition)
        throw new RetikzDataError('data: provider returned a different semantic Definition', { operationIndex });

      selected.push(support.implementation);
      inputDescriptor = { kind: 'result', model: stage.outputModel };
    }

    if (resolution.stages.length === 0 && descriptor.kind === 'source' && options.materializeSource === undefined)
      return {
        kind: 'unsupported',
        diagnostics: [
          { code: 'NO_MATERIALIZER', message: 'data: empty native source plan requires materializeSource' },
        ],
      };
    return plan;
  };
}

/**
 * 创建有作用域的执行策略；所有支持检查完成后才绑定并计算
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 * @param options 执行默认值、本地实现和具名外接 Provider；省略时使用内置计算
 * @returns 可预检、绑定并执行固定阶段计划的执行器
 * @throws {RetikzDataError} Provider 名称重复或计算实现重复注册
 */
export const createDataTransformExecutor = <TSource = never>(
  options: DataTransformExecutionOptions<TSource> = {},
): DataTransformExecutor<TSource> => new TransformExecutor(options);

/**
 * 统一异步入口；准备不支持时不计算，绑定后的执行只消费一次
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 * @param input 本次实际源输入或已计算结果
 * @param resolution 不读取行数据的语义解析结果
 * @param executor 承担能力预检与计算的执行器
 * @param options 本次执行覆盖、来源要求与取消信号；省略时不追加请求配置
 * @returns 所有阶段完成并校验后的结果 Promise
 * @throws {RetikzDataError} 预检不支持、输入不匹配、计算或结果校验失败，或请求被取消；Promise 会拒绝
 */
export const executeDataTransforms = async <TSource>(
  input: InputDataTransformStage<TSource>,
  resolution: DataTransformResolution,
  executor: DataTransformExecutor<TSource>,
  options: DataTransformRequestOptions = {},
): Promise<DataTransformResult> => {
  const ready = await executor.prepare(describeDataTransformInput(input), resolution, {
    ...options,
    provenance: options.provenance === true || hasDataProvenance(input),
  });
  if (ready.kind === 'unsupported')
    throw new RetikzDataError(ready.diagnostics.map(diagnostic => diagnostic.message).join('; '), {
      operationIndex: ready.diagnostics[0]?.operationIndex,
    });

  return ready.bind(input).execute();
};
