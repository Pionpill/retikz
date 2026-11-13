import { describe, expect, it } from 'vitest';

import { WeaveManager } from '../../src/weave';
import { WeaveTaskQueue } from '../../src/weave/schedule/queue';
import { WeaveTaskPhase } from '../../src/weave/schedule/task';

const createNodes = () => {
  const manager = new WeaveManager({
    type: 'scene',
    version: 1,
    children: [
      { type: 'coordinate', id: 'a', position: [0, 0] },
      { type: 'coordinate', id: 'b', position: [1, 0] },
      { type: 'coordinate', id: 'c', position: [2, 0] },
    ],
  });
  return manager.mount().root.current!.children.filter(node => node.type === 'coordinate');
};

describe('Weave 阶段就绪队列', () => {
  it('失败封闭当前候选并保留原异常，不执行剩余任务或重放失败回调', () => {
    const [first, second] = createNodes();
    const cause = new Error('provider failed');
    const executed: Array<string> = [];
    const queue = new WeaveTaskQueue(task => {
      executed.push(task.node === first ? 'first' : 'second');
      if (task.node === first) throw cause;
    });
    queue.request({ node: first, phase: WeaveTaskPhase.Compile });
    queue.request({ node: second, phase: WeaveTaskPhase.Compile });
    expect(() => queue.flush()).toThrow(expect.objectContaining({ cause }));
    expect(() => queue.flush()).toThrow(expect.objectContaining({ cause }));
    expect(() => queue.require({ node: second, phase: WeaveTaskPhase.Compile })).toThrow(
      expect.objectContaining({ cause }),
    );
    expect(executed).toEqual(['first']);
  });

  it('重复通知归并，动态生产者先完成后消费者继续执行', () => {
    const [a, b, c] = createNodes();
    const results: Array<string> = [];
    const queue = new WeaveTaskQueue(task => {
      if (task.node === a) {
        queue.require({ node: b, phase: WeaveTaskPhase.Compile });
        queue.require({ node: c, phase: WeaveTaskPhase.Compile });
        results.push('a');
      } else if (task.node === b) {
        queue.require({ node: c, phase: WeaveTaskPhase.Compile });
        results.push('b');
      } else results.push('c');
    });
    queue.request({ node: a, phase: WeaveTaskPhase.Compile });
    queue.request({ node: a, phase: WeaveTaskPhase.Compile });
    queue.request({ node: b, phase: WeaveTaskPhase.Compile });
    queue.flush();
    expect(results).toEqual(['c', 'b', 'a']);
  });

  it('生产者发生新的候选变化后，允许显式重新检查完成的任务', () => {
    const [node] = createNodes();
    let input = 1;
    let output = 0;
    const queue = new WeaveTaskQueue(() => {
      output = input * 2;
    });
    queue.request({ node, phase: WeaveTaskPhase.Compile });
    queue.flush();
    expect(output).toBe(2);
    input = 3;
    queue.invalidate({ node, phase: WeaveTaskPhase.Compile });
    queue.flush();
    expect(output).toBe(6);
  });

  it('同一实体不同阶段可以等待，实际阶段循环失败', () => {
    const [node] = createNodes();
    const completed: Array<string> = [];
    const queue = new WeaveTaskQueue(task => {
      if (task.phase === WeaveTaskPhase.Output) queue.require({ node, phase: WeaveTaskPhase.Compile });
      completed.push(task.phase);
    });
    queue.require({ node, phase: WeaveTaskPhase.Output });
    expect(completed).toEqual(['compile', 'output']);
    const cyclic = new WeaveTaskQueue(task => {
      cyclic.require({
        node,
        phase: task.phase === WeaveTaskPhase.Output ? WeaveTaskPhase.Compile : WeaveTaskPhase.Output,
      });
    });
    expect(() => cyclic.require({ node, phase: WeaveTaskPhase.Output })).toThrow(/cycle/);
  });
});
