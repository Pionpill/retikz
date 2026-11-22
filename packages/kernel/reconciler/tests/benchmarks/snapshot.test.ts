import type { IRScene } from '@retikz/core';
import { SceneReconciler } from '@retikz/reconciler';
import { describe, expect, it } from 'vitest';

import { compileBenchmarkSnapshot, verifyBenchmarkSnapshot } from '../../benchmarks/reconciler/_snapshot';

const invalidReference: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'missing' } },
        { type: 'step', kind: 'line', to: [20, 0] },
      ],
    },
  ],
};

describe('性能样本的语义验收', () => {
  it('拒绝Scene相同但丢失诊断的结果', () => {
    const snapshot = compileBenchmarkSnapshot(invalidReference, { onWarn: () => {} }, false, true);
    expect(snapshot.diagnostics.length).toBeGreaterThan(0);
    expect(() => verifyBenchmarkSnapshot({ ...snapshot, diagnostics: [] }, snapshot, [])).toThrow();
  });
  it('警告回调被隔离后仍拒绝该样本', () => {
    const session = new SceneReconciler({
      onWarn: () => {
        throw new Error('host warning failure');
      },
    });
    try {
      const result = session.mount(invalidReference);
      const isolated = session.diagnostics();
      expect(isolated.length).toBeGreaterThan(0);
      expect(() => verifyBenchmarkSnapshot(result.compilation, result.compilation, isolated)).toThrow();
    } finally {
      session.dispose();
    }
  });
  it('普通配方不允许意外诊断，显式诊断配方仍保留诊断', () => {
    expect(() => compileBenchmarkSnapshot(invalidReference, { onWarn: () => {} })).toThrow();
    expect(
      compileBenchmarkSnapshot(invalidReference, { onWarn: () => {} }, false, true).diagnostics.length,
    ).toBeGreaterThan(0);
  });
  it('不同编译身份下仍比较来源的父子关系、命名空间和发射归属', () => {
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'scope', localNamespace: true, children: [{ type: 'node', id: 'body', text: 'body' }] }],
    };
    const first = compileBenchmarkSnapshot(source, {}, true);
    const second = compileBenchmarkSnapshot(source, {}, true);
    verifyBenchmarkSnapshot(first, second, []);
  });
});
