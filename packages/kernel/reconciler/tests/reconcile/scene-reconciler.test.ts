import type { IRScene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import { SceneReconciler } from '../../src/reconciler';
import { compileTestResult } from '../helpers/compilation';

const scene: IRScene = { type: 'scene', version: 1, children: [{ type: 'node', id: 'a', position: [0, 0] }] };

describe('独立编译会话', () => {
  it('嵌套 Scope 的查询标识支持三种定位和插入，移动后保持稳定', () => {
    const session = new SceneReconciler();
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'scope', children: [{ type: 'scope', children: [{ type: 'node', id: 'a', position: [0, 0] }] }] },
      ],
    };
    const initial = session.mount(source);
    const rootId = session.getScopeId([], initial);
    const scopeId = session.getScopeId([0, 0], initial);
    const changed = session.update(
      {
        operations: [
          { kind: 'update', target: { kind: 'scope', scopeId }, input: { type: 'scope', position: [20, 10] } },
          {
            kind: 'update',
            target: { kind: 'id', scopeId, id: 'a' },
            input: { type: 'node', id: 'a', position: [5, 0] },
          },
          { kind: 'insert', parentId: scopeId, index: 1, elements: [{ type: 'node', id: 'b', position: [10, 0] }] },
          { kind: 'remove', target: { kind: 'child', scopeId, index: 1 } },
        ],
      },
      initial,
    );
    expect(changed.compilation.result).toEqual(
      compileTestResult({
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'scope',
            children: [{ type: 'scope', position: [20, 10], children: [{ type: 'node', id: 'a', position: [5, 0] }] }],
          },
        ],
      }),
    );
    expect(session.getScopeId([0, 0])).toBe(scopeId);
    expect(() => session.getScopeId([0, 0], initial)).toThrow('stale');
    session.update({
      operations: [
        {
          kind: 'insert',
          parentId: rootId,
          index: 0,
          elements: [{ type: 'coordinate', id: 'leading', position: [0, 0] }],
        },
      ],
    });
    expect(session.getScopeId([1, 0])).toBe(scopeId);
    expect(() => session.getScopeId([0])).toThrow('authored Scope');
    session.update({ operations: [{ kind: 'remove', target: { kind: 'scope', scopeId } }] });
    expect(() => session.getScopeId([1, 0])).toThrow('authored Scope');
    session.replace(source);
    expect(session.getScopeId()).not.toBe(rootId);
    expect(session.getScopeId([0, 0])).not.toBe(scopeId);
    expect(() => session.update({ operations: [{ kind: 'remove', target: { kind: 'scope', scopeId } }] })).toThrow();
    session.dispose();
  });

  it('作用域查询拒绝无效路径、其它会话结果及不可用会话', () => {
    const session = new SceneReconciler();
    expect(() => session.getScopeId()).toThrow('not mounted');
    const initial = session.mount(scene);
    for (const path of [[0], [5], [-1], [0.5]]) expect(() => session.getScopeId(path)).toThrow('authored Scope');
    expect(session.read()).toBe(initial);
    const other = new SceneReconciler();
    expect(() => session.getScopeId([], other.mount(scene))).toThrow('stale');
    other.dispose();
    session.dispose();
    expect(() => session.getScopeId()).toThrow('disposed');
    const full = new SceneReconciler({}, { incremental: false });
    full.mount(scene);
    expect(() => full.getScopeId()).toThrow('Non-incremental');
    full.dispose();
  });

  it('候选提交期间拒绝查询，回滚后保持原作用域标识', () => {
    let reject = false;
    const session = new SceneReconciler(
      {},
      {
        target: {
          prepare: () => {
            if (reject) expect(() => session.getScopeId()).toThrow('preparing');
            return {
              commit: () => {
                expect(() => session.getScopeId()).toThrow('committing');
                if (reject) throw new Error('host commit');
              },
              rollback: () => undefined,
              dispose: () => undefined,
            };
          },
        },
      },
    );
    const source: IRScene = { type: 'scene', version: 1, children: [{ type: 'scope', children: [] }] };
    const initial = session.mount(source);
    const scopeId = session.getScopeId([0]);
    reject = true;
    expect(() => session.update({ operations: [{ kind: 'remove', target: { kind: 'scope', scopeId } }] })).toThrow();
    expect(session.getScopeId([0], initial)).toBe(scopeId);
    expect(() => session.replace(scene)).toThrow();
    expect(session.getScopeId([0], initial)).toBe(scopeId);
    session.dispose();
  });

  it('不接入渲染端也能连续提交基础元素批次', () => {
    const session = new SceneReconciler();
    const initial = session.mount(scene);
    const scopeId = session.getScopeId([], initial);
    const first = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId, id: 'a' },
          input: { type: 'node', id: 'a', position: [10, 0] },
        },
      ],
    });
    expect(first.compilation.result).toEqual(
      compileTestResult({ ...scene, children: [{ type: 'node', id: 'a', position: [10, 0] }] }),
    );
    expect(first.revision).toBe(1);
    expect(session.update({ operations: [] })).toBe(first);
    expect(
      session.update({ operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'a' } }] }).compilation.result,
    ).toEqual(compileTestResult({ ...scene, children: [] }));
  });

  it('无效批次不推进结果且后续合法批次仍可提交', () => {
    const session = new SceneReconciler();
    const initial = session.mount(scene);
    expect(() =>
      session.update({
        operations: [{ kind: 'remove', target: { kind: 'id', scopeId: session.getScopeId(), id: 'missing' } }],
      }),
    ).toThrow();
    expect(session.read()).toBe(initial);
    expect(session.replace({ ...scene, children: [] }).revision).toBe(1);
  });

  it('宿主提交抛错时恢复计算与画面，并允许重试', () => {
    let visible = 0;
    let fail = false;
    const session = new SceneReconciler(
      {},
      {
        target: {
          prepare: candidate => {
            const before = visible;
            return {
              commit: () => {
                visible = candidate.revision;
                if (fail) throw new Error('host failed');
              },
              rollback: () => {
                visible = before;
              },
              dispose: () => undefined,
            };
          },
        },
      },
    );
    const initial = session.mount(scene);
    fail = true;
    expect(() =>
      session.update({
        operations: [{ kind: 'remove', target: { kind: 'id', scopeId: session.getScopeId(), id: 'a' } }],
      }),
    ).toThrow();
    expect(visible).toBe(0);
    expect(session.read()).toBe(initial);
    fail = false;
    expect(session.replace({ ...scene, children: [] }).revision).toBe(1);
  });

  it('配置更新复用编译结果，销毁与过期更新有明确边界', () => {
    const session = new SceneReconciler();
    const initial = session.mount(scene);
    const configured = session.updateTarget();
    expect(configured.compilation).toBe(initial.compilation);
    expect(configured.revision).toBe(1);
    expect(() => session.update({ operations: [] }, initial)).toThrow();
    session.dispose();
    expect(() => session.read()).toThrow();
  });
  it('full 批次重算未修改节点，auto 保留可复用编译结果', () => {
    const input: IRScene = { ...scene, children: [...scene.children, { type: 'node', id: 'b', position: [20, 0] }] };
    const counts: Array<number> = [];
    for (const updateStrategy of ['auto', 'full'] as const) {
      const trace = vi.fn();
      const session = new SceneReconciler({}, { updateStrategy, trace });
      const initial = session.mount(input);
      const result = session.update({
        operations: [
          {
            kind: 'update',
            target: { kind: 'id', scopeId: session.getScopeId([], initial), id: 'a' },
            input: { type: 'node', id: 'a', position: [10, 0] },
          },
        ],
      });
      expect(result.compilation.result).toEqual(
        compileTestResult({ ...input, children: [{ type: 'node', id: 'a', position: [10, 0] }, input.children[1]] }),
      );
      counts.push(trace.mock.calls.at(-1)![0].visited);
      expect(trace.mock.calls.at(-1)![0]).toMatchObject({
        owner: 'kernel/reconciler',
        phase: 'update',
        unit: 'element-compile',
        outcome: updateStrategy === 'full' ? 'full' : 'incremental',
      });
      session.dispose();
    }
    expect(counts[1]).toBeGreaterThan(counts[0]);
  });

  it('trace 抛错不影响已发布版本，失败事务不报告成功记录', () => {
    const trace = vi.fn(() => {
      throw new Error('observer');
    });
    let fail = false;
    const session = new SceneReconciler(
      {},
      {
        trace,
        target: {
          prepare: () => ({
            commit: () => {
              if (fail) throw new Error('commit');
            },
            rollback: () => undefined,
            dispose: () => undefined,
          }),
        },
      },
    );
    const initial = session.mount(scene);
    expect(session.read()).toBe(initial);
    expect(session.diagnostics()).toHaveLength(1);
    fail = true;
    expect(() => session.replace(scene)).toThrow();
    expect(trace).toHaveBeenCalledTimes(1);
    expect(session.read()).toBe(initial);
  });

  it('恢复失败阻断会话读写，但仍允许释放', () => {
    let fail = false;
    const dispose = vi.fn();
    const session = new SceneReconciler(
      {},
      {
        target: {
          dispose,
          prepare: () => ({
            commit: () => {
              if (fail) throw new Error('commit');
            },
            rollback: () => {
              throw new Error('rollback');
            },
            dispose: () => undefined,
          }),
        },
      },
    );
    session.mount(scene);
    fail = true;
    expect(() => session.replace(scene)).toThrow('Failed to restore');
    expect(() => session.read()).toThrow('broken');
    expect(() => session.replace(scene)).toThrow('broken');
    session.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
