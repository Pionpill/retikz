import { describe, expect, it } from 'vitest';

import { WeaveTaskGraph } from '../../src/weave/schedule';

describe('候选阶段依赖图', () => {
  it('消费者在读取点发现依赖时先完成生产者，同批重复需求只执行一次', () => {
    const graph = new WeaveTaskGraph();
    let geometry = 0;
    let output = 0;
    let computations = 0;
    graph.add('output', [], () => {
      graph.require('geometry');
      output = geometry * 2;
    });
    graph.add('geometry', ['context'], () => {
      computations++;
      geometry += 10;
    });
    graph.add('context', [], () => {
      geometry = 20;
    });
    graph.require('output');
    graph.require('geometry');
    graph.finish();
    expect(output).toBe(60);
    expect(computations).toBe(1);
  });

  it('动态环失败，不以尚未完成的旧值继续执行消费者', () => {
    const graph = new WeaveTaskGraph();
    let published = false;
    graph.add('a', [], () => {
      graph.require('b');
      published = true;
    });
    graph.add('b', [], () => graph.require('a'));
    expect(() => graph.require('a')).toThrow(/cycle: a/);
    expect(published).toBe(false);
  });

  it('区分没有生产阶段与已登记但未完成的等待任务', () => {
    const missing = new WeaveTaskGraph();
    missing.add('output', ['absent'], () => {});
    expect(() => missing.require('output')).toThrow(/missing-producer: absent/);
    const waiting = new WeaveTaskGraph();
    waiting.add('output', [], () => {});
    expect(() => waiting.finish()).toThrow(/waiting: output/);
  });
});
