import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';

/** 本批一次计算的依赖与推进状态，不跨批保存闭包 */
type WeaveTask = {
  dependencies: Set<string>;
  execute: () => void;
  state: 'pending' | 'running' | 'complete';
};

/** 同步按需阶段图，动态读取通过 require 增加边并先完成生产者 */
export class WeaveTaskGraph {
  /** 只有本批实际组装或计算所需的阶段进入任务图 */
  private readonly tasks = new Map<string, WeaveTask>();
  /** 正在求值的阶段链，用于动态依赖及环诊断 */
  private readonly active: Array<string> = [];

  /** 登记阶段；依赖可以晚于消费者登记，但执行前必须存在 */
  add(key: string, dependencies: Iterable<string>, execute: () => void): void {
    if (this.tasks.has(key)) this.fail('duplicate', key);
    this.tasks.set(key, { dependencies: new Set(dependencies), execute, state: 'pending' });
  }

  /** 阶段是否已登记；合法缺失引用仍交 Core 处理 */
  has(key: string): boolean {
    return this.tasks.has(key);
  }

  /**
   * 等待依赖并推进所需阶段
   * @description 同步求值在读取点完成生产者再恢复消费者，不重新执行已经产生副作用的消费者前缀
   */
  require(key: string): void {
    const consumer = this.active.at(-1);
    if (consumer !== undefined && consumer !== key) this.tasks.get(consumer)!.dependencies.add(key);
    const task = this.tasks.get(key);
    if (task === undefined) this.fail('missing-producer', key);
    if (task.state === 'complete') return;
    if (task.state === 'running') this.fail('cycle', key);
    task.state = 'running';
    this.active.push(key);
    try {
      for (const dependency of task.dependencies) this.require(dependency);
      task.execute();
      task.state = 'complete';
    } finally {
      this.active.pop();
    }
  }

  /** 输出返回前拒绝遗留的未就绪阶段，不无限重试 */
  finish(): void {
    for (const [key, task] of this.tasks) if (task.state !== 'complete') this.fail('waiting', key);
  }

  private fail(reason: 'duplicate' | 'missing-producer' | 'cycle' | 'waiting', key: string): never {
    throw new RetikzReconcilerError({
      code: RetikzReconcilerErrorCode.Compile,
      message: `Weave stage ${reason}: ${key}`,
      details: { reason, stage: key, chain: [...this.active, key] },
    });
  }
}
