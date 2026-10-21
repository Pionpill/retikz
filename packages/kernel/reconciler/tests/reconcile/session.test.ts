import { compileToScene } from '@retikz/core';
import type { IRScene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import { ReconcilerSession } from '../../src/session';

const scene: IRScene = { type: 'scene', version: 1, children: [{ type: 'node', id: 'a', position: [0, 0] }] };

describe('独立编译会话', () => {
  it('不接入渲染端也能连续提交基础元素批次', () => {
    const session = new ReconcilerSession();
    const initial = session.mount(scene);
    const scopeId = initial.root!.scopeId;
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
      compileToScene({ ...scene, children: [{ type: 'node', id: 'a', position: [10, 0] }] }),
    );
    expect(first.revision).toBe(1);
    expect(session.update({ operations: [] })).toBe(first);
    expect(
      session.update({ operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'a' } }] }).compilation.result,
    ).toEqual(compileToScene({ ...scene, children: [] }));
  });

  it('无效批次不推进结果且后续合法批次仍可提交', () => {
    const session = new ReconcilerSession();
    const initial = session.mount(scene);
    expect(() =>
      session.update({
        operations: [{ kind: 'remove', target: { kind: 'id', scopeId: initial.root!.scopeId, id: 'missing' } }],
      }),
    ).toThrow();
    expect(session.read()).toBe(initial);
    expect(session.replace({ ...scene, children: [] }).revision).toBe(1);
  });

  it('宿主提交抛错时恢复计算与画面，并允许重试', () => {
    let visible = 0;
    let fail = false;
    const session = new ReconcilerSession(
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
        operations: [{ kind: 'remove', target: { kind: 'id', scopeId: initial.root!.scopeId, id: 'a' } }],
      }),
    ).toThrow();
    expect(visible).toBe(0);
    expect(session.read()).toBe(initial);
    fail = false;
    expect(session.replace({ ...scene, children: [] }).revision).toBe(1);
  });

  it('配置更新复用编译结果，销毁与过期更新有明确边界', () => {
    const session = new ReconcilerSession();
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
      const session = new ReconcilerSession({}, { updateStrategy, trace });
      const initial = session.mount(input);
      const result = session.update({
        operations: [
          {
            kind: 'update',
            target: { kind: 'id', scopeId: initial.root!.scopeId, id: 'a' },
            input: { type: 'node', id: 'a', position: [10, 0] },
          },
        ],
      });
      expect(result.compilation.result).toEqual(
        compileToScene({ ...input, children: [{ type: 'node', id: 'a', position: [10, 0] }, input.children[1]] }),
      );
      counts.push(trace.mock.calls.at(-1)![0].visited);
      session.dispose();
    }
    expect(counts[1]).toBeGreaterThan(counts[0]);
  });

  it('trace 抛错不影响已发布版本，失败事务不报告成功记录', () => {
    const trace = vi.fn(() => {
      throw new Error('observer');
    });
    let fail = false;
    const session = new ReconcilerSession(
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
    const session = new ReconcilerSession(
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
