import { RetikzDataError } from '../error';
import type { DataTransformResult } from '../model';
import { createDataLineageRecorder, importDataLineageEvents } from '../provenance';
import type { DataTransformExecution, InputDataTransformStage } from './contract';
import type { PreparedTransformPlan } from './prepared-plan';
import { assertDataExecutionActive, assertDataTransformResult } from './result';

/**
 * 一次真实输入的执行状态；开始调用即消费执行权
 * @template TSource 本次绑定的原生源句柄类型
 */
export class TransformExecution<TSource> implements DataTransformExecution {
  private consumed = false;

  constructor(
    private readonly plan: PreparedTransformPlan<TSource>,
    private readonly input: InputDataTransformStage<TSource>,
  ) {}

  /** 重复调用同步抛错；异步等待、失败与取消均不恢复执行权 */
  execute = (): Promise<DataTransformResult> => {
    if (this.consumed) throw new RetikzDataError('data: execution can only run once; execution right consumed');

    this.consumed = true;
    assertDataExecutionActive(this.plan.signal);
    return this.run();
  };

  /** 按固定阶段推进当前输入，事件累积只属于本次执行 */
  private async run(): Promise<DataTransformResult> {
    const input = this.input;
    const { resolution, selected, localStages, materialize } = this.plan;
    const lineageOptions = this.plan.requirements.lineage;
    let current = input;
    const events = input.kind === 'result' ? [...(input.result.lineage?.events ?? [])] : [];
    if (lineageOptions !== undefined && input.kind === 'result') {
      const source = createDataLineageRecorder({ ...lineageOptions, sink: undefined, retainEvents: true });
      source.recordSource(input.result.rows);
      events.push(...importDataLineageEvents(source.events, lineageOptions));
    }

    for (const [operationIndex, implementation] of selected.entries()) {
      assertDataExecutionActive(this.plan.signal);
      let result: DataTransformResult;

      try {
        result = await implementation.execute(current);
      } catch (cause) {
        throw new RetikzDataError(`data: execution failed at index ${operationIndex}`, {
          cause,
          operationIndex,
        });
      }

      assertDataExecutionActive(this.plan.signal);
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
        lineageOptions === undefined
          ? current.kind === 'source' && localStages.has(operationIndex)
            ? added
            : []
          : importDataLineageEvents(added, lineageOptions, operationIndex);
      events.push(...recorded);
      current = {
        kind: 'result',
        result: { ...result, ...(events.length === 0 ? {} : { lineage: { events: [...events] } }) },
      };
    }

    if (current.kind === 'source') {
      const materialized = await materialize(current);
      events.push(
        ...(lineageOptions === undefined
          ? (materialized.lineage?.events ?? [])
          : importDataLineageEvents(materialized.lineage?.events ?? [], lineageOptions)),
      );
      if (lineageOptions !== undefined) {
        const source = createDataLineageRecorder({
          ...lineageOptions,
          sink: undefined,
          retainEvents: true,
        });
        source.recordSource(materialized.rows);
        events.push(...importDataLineageEvents(source.events, lineageOptions));
      }

      current = { kind: 'result', result: materialized };
    }

    const result = current.result;
    assertDataExecutionActive(this.plan.signal);
    assertDataTransformResult(resolution.stages.at(-1)?.outputModel ?? resolution.inputModel, result);

    return {
      ...result,
      ...(events.length === 0 && lineageOptions === undefined ? {} : { lineage: { events } }),
    };
  }
}
