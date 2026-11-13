import { RetikzError } from '@retikz/foundation';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';
import type { WeaveNode } from '../shared';
import type { WeaveTaskAddress, WeaveTaskPhase, WeaveTaskRecord } from './task';

/** 同步就绪队列；动态读取在原调用栈完成生产者，不通过重放回调模拟等待 */
export class WeaveTaskQueue {
  /** 稳定节点及其本批阶段记录 */
  private readonly tasks = new Map<WeaveNode, Map<WeaveTaskPhase, WeaveTaskRecord>>();
  /** 已归并的待检查记录；require 提前完成后，出队时直接跳过 */
  private readonly ready: Array<WeaveTaskRecord> = [];
  /** 活动阶段链，只用于真实依赖环诊断 */
  private readonly active: Array<WeaveTaskAddress> = [];
  /** 出队游标避免每次移除首项；队列仅在当前候选内存活 */
  private cursor = 0;
  /** 任一阶段失败后封闭整个候选，禁止继续执行尚未发布的副作用 */
  private failure: RetikzError | undefined;

  constructor(
    private readonly execute: (task: WeaveTaskAddress) => void,
    private readonly completed?: (task: WeaveTaskAddress) => void,
  ) {}

  /** 查询本批已登记的边界，不因探测而提前建立任务 */
  has(address: WeaveTaskAddress): boolean {
    return this.tasks.get(address.node)?.has(address.phase) === true;
  }

  /** 通知一个尚未完成的阶段，相同通知不产生第二份执行记录 */
  request(address: WeaveTaskAddress): void {
    this.record(address);
  }

  /** 已完成阶段的输入确实再次改变时，重新加入检查队列 */
  invalidate(address: WeaveTaskAddress): void {
    const record = this.record(address);
    if (record.state === 'running') this.fail('invalidated-running', address);
    if (record.state === 'complete') {
      record.state = 'pending';
      this.ready.push(record);
    }
  }

  /** 在读取点完成生产者；调用方负责判断该阶段是否能复用有效结果 */
  require(address: WeaveTaskAddress, execute?: () => void): void {
    const record = this.record(address);
    if (record.state === 'complete') return;
    if (record.state === 'running') this.fail('cycle', address);
    record.state = 'running';
    this.active.push(address);
    try {
      if (execute === undefined) this.execute(address);
      else execute();
      record.state = 'complete';
      this.completed?.(address);
    } catch (cause) {
      this.failure ??=
        cause instanceof RetikzError
          ? cause
          : new RetikzReconcilerError({
              code: RetikzReconcilerErrorCode.Compile,
              message: `Weave stage failed: ${address.node.type}:${address.phase}`,
              cause,
            });
      throw this.failure;
    } finally {
      this.active.pop();
    }
  }

  /** 推进已通知阶段，执行中追加的通知也属于同一批 */
  flush(): void {
    if (this.failure !== undefined) throw this.failure;
    while (this.cursor < this.ready.length) {
      const record = this.ready[this.cursor++];
      this.require(record.address);
    }
  }

  private record(address: WeaveTaskAddress): WeaveTaskRecord {
    if (this.failure !== undefined) throw this.failure;
    let phases = this.tasks.get(address.node);
    if (phases === undefined) this.tasks.set(address.node, (phases = new Map()));
    let record = phases.get(address.phase);
    if (record === undefined) {
      record = { address, state: 'pending' };
      phases.set(address.phase, record);
      this.ready.push(record);
    }
    return record;
  }

  private fail(reason: 'cycle' | 'invalidated-running', address: WeaveTaskAddress): never {
    throw new RetikzReconcilerError({
      code: RetikzReconcilerErrorCode.Compile,
      message: `Weave stage ${reason}: ${address.node.type}:${address.phase}`,
      details: {
        reason,
        chain: [...this.active, address].map(task => ({ type: task.node.type, phase: task.phase })),
      },
    });
  }
}
