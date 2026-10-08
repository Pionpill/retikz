import type {
  AnyTransformImplementation,
  DataTransformExecutionOptions,
  DataTransformExecutor,
  DataTransformInputDescriptor,
  DataTransformModel,
  DataTransformPreparation,
  DataTransformRequestOptions,
  DataTransformResolution,
  DataTransformResult,
  DataTransformStageImplementation,
  DataTransformStageInput,
  DataTransformStageSupport,
  TransformContext,
} from '../contract';
import { extractTransformKind } from '../contract';
import { RetikzDataError } from '../error';
import { BUILTIN_TRANSFORM_IMPLEMENTATIONS } from '../providers';
import { prepareLocalDataTransform } from '../providers/execution';
import {
  assertDataTransformModel,
  assertDataTransformResult,
  resolveDataExecution,
  resolveDataTransformOutputModel,
} from '../resolve';
import { createDataLineageRecorder, importDataLineageEvents } from './lineage';
import { readSourceIndex, readSourceIndices } from './provenance';
import { DEFAULT_TRANSFORM_CONTEXT } from './transform';

/** 取消终止请求，不被解释为 unsupported */
const assertActive = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new RetikzDataError('data: execution cancelled', { cause: signal.reason });
};

/** 读取实际输入模型，不读取源行 */
const inputModelOf = <TSource>(input: DataTransformStageInput<TSource>): DataTransformModel =>
  input.kind === 'source' ? input.model : input.result.model;

/**
 * 将实际输入投影为无行数据的能力描述
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export const describeDataTransformInput = <TSource>(
  input: DataTransformStageInput<TSource>,
): DataTransformInputDescriptor<TSource> =>
  input.kind === 'source' ? input : { kind: 'result', model: input.result.model };

/** 输入是否已有真实行级或组级来源 */
const hasProvenance = <TSource>(input: DataTransformStageInput<TSource>): boolean =>
  input.kind === 'result' &&
  input.result.rows.some(row => readSourceIndex(row) !== undefined || readSourceIndices(row) !== undefined);

/**
 * 创建有作用域的执行策略；所有支持检查完成后才绑定并计算
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const createDataTransformExecutor = <TSource = never>(
  options: DataTransformExecutionOptions<TSource> = {},
): DataTransformExecutor<TSource> => {
  const providers = new Map<
    string,
    NonNullable<DataTransformExecutionOptions<TSource>['externalProviders']>[number]['provider']
  >();

  for (const registration of options.externalProviders ?? []) {
    if (providers.has(registration.name))
      throw new RetikzDataError(`data: duplicate external provider "${registration.name}"`);
    providers.set(registration.name, registration.provider);
  }

  const implementations = new Map<string, AnyTransformImplementation>();

  for (const implementation of [...BUILTIN_TRANSFORM_IMPLEMENTATIONS, ...(options.transformImplementations ?? [])]) {
    const kind = extractTransformKind(implementation.definition.schema);
    if (implementations.has(kind)) throw new RetikzDataError(`data: duplicate implementation registration: "${kind}"`);
    implementations.set(kind, implementation);
  }

  return {
    prepare: async (descriptor, resolution, request = {}): Promise<DataTransformPreparation<TSource>> => {
      assertActive(request.signal);
      assertDataTransformModel(resolution.inputModel, descriptor.model);
      const requirements = {
        preserveProvenance: request.provenance === true,
        ...(request.lineage === undefined ? {} : { lineage: request.lineage }),
      };
      const selected: Array<DataTransformStageImplementation<TSource>> = [];
      const localStages = new Set<number>();

      /** 源物化与所有其它用户回调采用相同错误和取消边界 */
      const materialize = async (
        input: Extract<DataTransformStageInput<TSource>, { kind: 'source' }>,
      ): Promise<DataTransformResult> => {
        const materializer = options.materializeSource;
        if (materializer === undefined) throw new RetikzDataError('data: source materializer is unavailable');

        assertActive(request.signal);
        let result: DataTransformResult;

        try {
          result = await materializer(input.source, input.model, { requirements, signal: request.signal });
        } catch (cause) {
          throw new RetikzDataError('data: source materialization failed', { cause });
        }

        assertActive(request.signal);
        assertDataTransformResult(input.model, result);
        if (hasProvenance({ kind: 'result', result }) && !requirements.preserveProvenance)
          throw new RetikzDataError('data: materialized provenance is not covered by preflight requirements');

        return result;
      };

      let inputDescriptor = descriptor;

      for (const [operationIndex, stage] of resolution.stages.entries()) {
        assertActive(request.signal);
        const policy = resolveDataExecution(options.dataExecution, request.dataExecution, stage.dataExecution);
        let support: DataTransformStageSupport<TSource> | undefined;
        if (policy.mode !== 'builtin') {
          const provider = policy.external === undefined ? undefined : providers.get(policy.external);
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

          assertActive(request.signal);
          if (support.kind === 'unsupported' && support.diagnostics.length === 0)
            throw new RetikzDataError('data: unsupported provider must return diagnostics', { operationIndex });
          if (support.kind === 'unsupported' && policy.mode === 'external') return support;
        }

        if (support === undefined || support.kind === 'unsupported') {
          const implementation = implementations.get(stage.operation.kind);
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

          const local = prepareLocalDataTransform(stage, options);
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
            implementation: {
              definition: stage.definition,
              execute: async current => {
                const result = current.kind === 'result' ? current.result : await materialize(current);
                assertDataTransformResult(
                  operationIndex === 0 ? resolution.inputModel : resolution.stages[operationIndex - 1].outputModel,
                  result,
                );
                const lineage =
                  request.lineage === undefined
                    ? undefined
                    : createDataLineageRecorder({ ...request.lineage, sink: undefined, retainEvents: true });
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
            },
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

      return {
        kind: 'ready',
        bind: input => {
          assertActive(request.signal);
          assertDataTransformModel(descriptor.model, inputModelOf(input));
          if (
            input.kind !== descriptor.kind ||
            (input.kind === 'source' && descriptor.kind === 'source' && input.source !== descriptor.source)
          )
            throw new RetikzDataError('data: bound input does not match its prepared descriptor');

          if (hasProvenance(input) && !requirements.preserveProvenance)
            throw new RetikzDataError('data: bound input has provenance not covered by preflight requirements');
          if (input.kind === 'result') assertDataTransformResult(descriptor.model, input.result);
          let consumed = false;

          return {
            execute: () => {
              if (consumed) throw new RetikzDataError('data: execution can only run once; execution right consumed');

              consumed = true;
              assertActive(request.signal);

              return (async () => {
                let current = input;
                const events = input.kind === 'result' ? [...(input.result.lineage?.events ?? [])] : [];
                if (request.lineage !== undefined && input.kind === 'result') {
                  const source = createDataLineageRecorder({ ...request.lineage, sink: undefined, retainEvents: true });
                  source.recordSource(input.result.rows);
                  events.push(...importDataLineageEvents(source.events, request.lineage));
                }

                for (const [operationIndex, implementation] of selected.entries()) {
                  assertActive(request.signal);
                  let result: DataTransformResult;

                  try {
                    result = await implementation.execute(current);
                  } catch (cause) {
                    throw new RetikzDataError(`data: execution failed at index ${operationIndex}`, {
                      cause,
                      operationIndex,
                    });
                  }

                  assertActive(request.signal);
                  try {
                    assertDataTransformResult(resolution.stages[operationIndex].outputModel, result);
                  } catch (cause) {
                    throw new RetikzDataError(`data: invalid result model or values at index ${operationIndex}`, {
                      cause,
                      operationIndex,
                    });
                  }
                  const previousEvents = current.kind === 'result' ? (current.result.lineage?.events ?? []) : [];
                  const returnedEvents = result.lineage?.events ?? [];
                  let prefix = 0;

                  while (
                    prefix < previousEvents.length &&
                    prefix < returnedEvents.length &&
                    JSON.stringify(previousEvents[prefix]) === JSON.stringify(returnedEvents[prefix])
                  )
                    prefix++;

                  const added = returnedEvents.slice(prefix).filter(event => !previousEvents.includes(event));
                  const recorded =
                    request.lineage === undefined
                      ? current.kind === 'source' && localStages.has(operationIndex)
                        ? added
                        : []
                      : importDataLineageEvents(added, request.lineage, operationIndex);
                  events.push(...recorded);
                  current = {
                    kind: 'result',
                    result: { ...result, ...(events.length === 0 ? {} : { lineage: { events: [...events] } }) },
                  };
                }

                if (current.kind === 'source') {
                  const materialized = await materialize(current);
                  events.push(
                    ...(request.lineage === undefined
                      ? (materialized.lineage?.events ?? [])
                      : importDataLineageEvents(materialized.lineage?.events ?? [], request.lineage)),
                  );
                  if (request.lineage !== undefined) {
                    const source = createDataLineageRecorder({
                      ...request.lineage,
                      sink: undefined,
                      retainEvents: true,
                    });
                    source.recordSource(materialized.rows);
                    events.push(...importDataLineageEvents(source.events, request.lineage));
                  }

                  current = { kind: 'result', result: materialized };
                }

                const result = current.result;
                assertActive(request.signal);
                assertDataTransformResult(resolution.stages.at(-1)?.outputModel ?? resolution.inputModel, result);

                return {
                  ...result,
                  ...(events.length === 0 && request.lineage === undefined ? {} : { lineage: { events } }),
                };
              })();
            },
          };
        },
      };
    },
  };
};

/**
 * 统一异步入口；准备不支持时不计算，绑定后的执行只消费一次
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export const executeDataTransforms = async <TSource>(
  input: DataTransformStageInput<TSource>,
  resolution: DataTransformResolution,
  executor: DataTransformExecutor<TSource>,
  options: DataTransformRequestOptions = {},
): Promise<DataTransformResult> => {
  const ready = await executor.prepare(describeDataTransformInput(input), resolution, {
    ...options,
    provenance: options.provenance === true || hasProvenance(input),
  });
  if (ready.kind === 'unsupported')
    throw new RetikzDataError(ready.diagnostics.map(diagnostic => diagnostic.message).join('; '), {
      operationIndex: ready.diagnostics[0]?.operationIndex,
    });

  return ready.bind(input).execute();
};
