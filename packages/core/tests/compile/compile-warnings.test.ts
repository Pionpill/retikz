import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning, IR } from '../../src';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

describe('CompileOptions.onWarn', () => {
  it('PATH_TOO_SHORT：path 仅含 1 个 step → 触发 warning + path 字段含 IR locator', () => {
    const ir = scene([
      {
        type: 'path',
        children: [{ type: 'step', kind: 'move', to: [0, 0] }],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      code: 'PATH_TOO_SHORT',
      path: 'children[0].path.children',
    });
    expect(warnings[0].message).toContain('at least 2 steps');
  });

  it("UNRESOLVED_NODE_REFERENCE：step.to 引用未定义节点 id → warning + path locator 指向具体 step", () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'bogus' },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.some(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toBe(true);
    const unresolved = warnings.find(w => w.code === 'UNRESOLVED_NODE_REFERENCE');
    expect(unresolved!.path).toBe('children[0].path.children[0].to');
    expect(unresolved!.message).toContain("'bogus'");
  });

  it('未定义节点 id 出现在中段 → path locator 指向中段 index', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'A' },
          { type: 'step', kind: 'line', to: 'bogus' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    const unresolved = warnings.find(w => w.code === 'UNRESOLVED_NODE_REFERENCE');
    expect(unresolved!.path).toBe('children[1].path.children[1].to');
  });

  it('多个 silent fail → onWarn 按发生顺序同步触发', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'bogus1' },
          { type: 'step', kind: 'line', to: 'bogus2' },
        ],
      },
    ]);
    const codes: Array<string> = [];
    compileToScene(ir, { onWarn: w => codes.push(w.code) });
    expect(codes.filter(c => c === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(2);
  });

  it('happy path 不触发 onWarn', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'A' },
          { type: 'step', kind: 'line', to: [100, 0] },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings).toHaveLength(0);
  });
});

describe('CompileOptions.onWarn 缺省行为', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('不传 onWarn + dev 模式 → 默认 console.warn 触发，含 code / path / message', () => {
    const ir = scene([
      { type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] },
    ]);
    compileToScene(ir);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const msg = consoleWarnSpy.mock.calls[0][0] as string;
    expect(msg).toContain('[retikz]');
    expect(msg).toContain('PATH_TOO_SHORT');
    expect(msg).toContain('children[0].path.children');
  });

  it('不传 onWarn + 显式传 onWarn=空函数 → console.warn 不触发（用户接管）', () => {
    const ir = scene([
      { type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] },
    ]);
    compileToScene(ir, { onWarn: () => {} });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
