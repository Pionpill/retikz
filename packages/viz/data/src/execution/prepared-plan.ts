import { RetikzDataError } from '../error';
import type { DataTransformResult } from '../model';
import { createDataLineageRecorder, resolveDataLineageOptions } from '../provenance';
import type {
  AnyTransformImplementation,
  DataTransformResolution,
  DataTransformStage,
  TransformContext,
} from '../transform';
import { resolveDataTransformOutputModel } from '../transform';
import { DEFAULT_TRANSFORM_CONTEXT } from './apply';
import type {
  DataTransformExecution,
  DataTransformExecutionOptions,
  DataTransformExecutionRequirements,
  DataTransformInputDescriptor,
  DataTransformPreparation,
  DataTransformRequestOptions,
  DataTransformStageImplementation,
  DataTransformStageInput,
} from './contract';
import {
  assertDataExecutionActive,
  assertDataTransformModel,
  assertDataTransformResult,
  hasDataProvenance,
} from './result';
import { TransformExecution } from './run';

/**
 * 请求级的固定阶段计划；每次绑定独立创建执行权
 * @template TSource 当前计划支持的原生源句柄类型
 */
export class PreparedTransformPlan<TSource> implements Extract<DataTransformPreparation<TSource>, { kind: 'ready' }> {
  /** 已完成预检后对调用方返回的判别值 */
  readonly kind = 'ready';
  /** 本次预检固定的来源保留与事件记录要求 */
  readonly requirements: DataTransformExecutionRequirements;

  constructor(
    private readonly descriptor: DataTransformInputDescriptor<TSource>,
    /** 全部阶段共享的字段模型与语义计划 */
    readonly resolution: DataTransformResolution,
    private readonly request: DataTransformRequestOptions,
    private readonly materializeSource: DataTransformExecutionOptions<TSource>['materializeSource'],
    /** 预检选定的实现，绑定与运行期间不重新路由 */
    readonly selected: ReadonlyArray<DataTransformStageImplementation<TSource>>,
    /** 本地执行阶段的位置，用于接入源物化产生的事件 */
    readonly localStages: ReadonlySet<number>,
  ) {
    const lineage = resolveDataLineageOptions(request.lineage);
    this.requirements = {
      preserveProvenance: request.provenance === true,
      ...(lineage === undefined ? {} : { lineage }),
    };
  }

  /** 当前请求的取消信号，不与其它计划共享可变执行状态 */
  get signal(): AbortSignal | undefined {
    return this.request.signal;
  }

  /** 校验实际输入并创建独立的一次性执行实例 */
  bind = (input: DataTransformStageInput<TSource>): DataTransformExecution => {
    assertDataExecutionActive(this.signal);
    assertDataTransformModel(this.descriptor.model, input.kind === 'source' ? input.model : input.result.model);
    if (
      input.kind !== this.descriptor.kind ||
      (input.kind === 'source' && this.descriptor.kind === 'source' && input.source !== this.descriptor.source)
    )
      throw new RetikzDataError('data: bound input does not match its prepared descriptor');

    if (hasDataProvenance(input) && !this.requirements.preserveProvenance)
      throw new RetikzDataError('data: bound input has provenance not covered by preflight requirements');
    if (input.kind === 'result') assertDataTransformResult(this.descriptor.model, input.result);
    return new TransformExecution(this, input);
  };

  /** 源物化遵守请求级取消、模型与来源要求 */
  materialize = async (
    input: Extract<DataTransformStageInput<TSource>, { kind: 'source' }>,
  ): Promise<DataTransformResult> => {
    const materializer = this.materializeSource;
    if (materializer === undefined) throw new RetikzDataError('data: source materializer is unavailable');

    assertDataExecutionActive(this.signal);
    let result: DataTransformResult;

    try {
      result = await materializer(input.source, input.model, { requirements: this.requirements, signal: this.signal });
    } catch (cause) {
      throw new RetikzDataError('data: source materialization failed', { cause });
    }

    assertDataExecutionActive(this.signal);
    assertDataTransformResult(input.model, result);
    if (hasDataProvenance({ kind: 'result', result }) && !this.requirements.preserveProvenance)
      throw new RetikzDataError('data: materialized provenance is not covered by preflight requirements');

    return result;
  };

  /** 为本地阶段绑定计划语义；每次执行建立独立的计算上下文 */
  bindLocalStage(
    stage: DataTransformStage,
    operationIndex: number,
    local: (context: TransformContext) => AnyTransformImplementation,
  ): DataTransformStageImplementation<TSource> {
    return {
      definition: stage.definition,
      execute: async current => {
        const resolution = this.resolution;
        const lineageOptions = this.requirements.lineage;
        const result = current.kind === 'result' ? current.result : await this.materialize(current);
        assertDataTransformResult(
          operationIndex === 0 ? resolution.inputModel : resolution.stages[operationIndex - 1].outputModel,
          result,
        );
        const lineage =
          lineageOptions === undefined
            ? undefined
            : createDataLineageRecorder({ ...lineageOptions, sink: undefined, retainEvents: true });
        const context: TransformContext = { ...DEFAULT_TRANSFORM_CONTEXT, lineage };
        if (current.kind === 'source') lineage?.recordSource(result.rows);
        const rows = await local(context).apply(result.rows, stage.operation as never, context);
        const semantic = { model: result.model, ...context };
        const output = stage.definition.outputModel(stage.operation as never, semantic);
        lineage?.recordTransformStep({
          operationIndex,
          operation: stage.operation,
          inputRows: result.rows,
          outputRows: rows,
          inputFields: stage.definition.inputFields?.(stage.operation as never, semantic) ?? [],
          outputFields: (output.kind === 'preserve' ? output.outputs : output.fields)
            .filter(
              field =>
                output.kind === 'preserve' ||
                field.type === undefined ||
                typeof field.type === 'string' ||
                field.type.from !== field.field,
            )
            .map(field => field.field),
        });

        return {
          rows,
          model: resolveDataTransformOutputModel(result.model, output),
          ...(result.lineage === undefined && lineage === undefined
            ? {}
            : {
                lineage: { events: [...(result.lineage?.events ?? []), ...(lineage?.events ?? [])] },
              }),
        };
      },
    };
  }
}
