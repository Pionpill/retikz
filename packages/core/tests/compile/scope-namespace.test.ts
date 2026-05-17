/**
 * `<Scope localNamespace>` 隔离与 inside-out lookup 集成测试
 * @description 覆盖 localNamespace 创建子 frame、跨 frame shadowing 不算 duplicate、外层不可见内层、scope.id 始终注册到父 frame、scope at-translate 的 of= 走 inside-out lookup
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning, IR, Scene, ScenePrimitive } from '../../src';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

const compileWithWarnings = (
  ir: IR,
): { compiled: Scene; warnings: Array<CompileWarning> } => {
  const warnings: Array<CompileWarning> = [];
  const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
  return { compiled, warnings };
};

/** 顶层第一条 path primitive */
const topPath = (prims: ReadonlyArray<ScenePrimitive>): ScenePrimitive | undefined =>
  prims.find(p => p.type === 'path');

/** 取第一条 line 命令的 to 端点 */
const lineTo = (prim: ScenePrimitive | undefined): [number, number] | undefined => {
  if (!prim || prim.type !== 'path') return undefined;
  for (const cmd of prim.commands) {
    if (cmd.kind === 'line') return cmd.to;
  }
  return undefined;
};

describe('localNamespace 隔离子 frame', () => {
  it('local_namespace_isolates_internal_id：外层 id="A" + 内层 localNamespace id="A" 不冲突、各自命中各自 frame', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'outer' },
      {
        type: 'scope',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 200, y: 0 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'inner' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, -50] },
              { type: 'step', kind: 'line', to: 'A' },
            ],
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 50] },
          { type: 'step', kind: 'line', to: 'A' },
        ],
      },
    ]);
    const { compiled, warnings } = compileWithWarnings(ir);
    // 两个 A 跨 frame 不算 duplicate
    expect(warnings.filter(w => w.code === 'DUPLICATE_NODE_ID')).toHaveLength(0);
    const paths = compiled.primitives.filter(p => p.type === 'path');
    expect(paths).toHaveLength(2);
    // 第一条 path（来自 scope 内）：内层 A 全局中心 ≈ (200, 0)
    // 第二条 path（顶层）：外层 A 全局中心 ≈ (0, 0)
    const ends = paths.map(lineTo).filter((p): p is [number, number] => !!p);
    expect(ends).toHaveLength(2);
    // 一条端点 x 接近 200（内层 A），另一条接近 0（外层 A）
    const sorted = ends.map(p => p[0]).sort((a, b) => a - b);
    expect(Math.abs(sorted[0] - 0)).toBeLessThan(30);
    expect(Math.abs(sorted[1] - 200)).toBeLessThan(30);
  });

  it('local_namespace_internal_can_reference_external：内层 path inside-out 命中外层 id', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          { type: 'node', id: 'inner', position: [0, 0], text: 'I' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: 'inner' },
              { type: 'step', kind: 'line', to: 'hub' },
            ],
          },
        ],
      },
    ]);
    const { compiled, warnings } = compileWithWarnings(ir);
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    const p = topPath(compiled.primitives);
    expect(p).toBeDefined();
    // line 到 hub 全局 (0, 0)；boundary clip ±20
    const end = lineTo(p);
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 0)).toBeLessThan(20);
  });

  it('local_namespace_external_cannot_reference_internal：外层 path 引用内层 id 触发 UNRESOLVED_NODE_REFERENCE warn', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        localNamespace: true,
        children: [
          { type: 'node', id: 'hidden', position: [100, 0], text: 'hidden' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'hub' },
          { type: 'step', kind: 'line', to: 'hidden' },
        ],
      },
    ]);
    const { warnings } = compileWithWarnings(ir);
    expect(warnings.some(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toBe(true);
  });

  it('local_namespace_nested_3_levels_shadowing：三层嵌套各层 id="A"，最内层 path 命中最内层；中层 path 命中中层', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'root-A' },
      {
        type: 'scope',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'l1-A' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 60] },
              { type: 'step', kind: 'line', to: 'A' },
            ],
          },
          {
            type: 'scope',
            localNamespace: true,
            transforms: [{ kind: 'translate', x: 100, y: 0 }],
            children: [
              { type: 'node', id: 'A', position: [0, 0], text: 'l2-A' },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [0, 60] },
                  { type: 'step', kind: 'line', to: 'A' },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const { compiled, warnings } = compileWithWarnings(ir);
    // 三个 A 跨 frame，全部 shadowing，没有 duplicate warn
    expect(warnings.filter(w => w.code === 'DUPLICATE_NODE_ID')).toHaveLength(0);
    const paths = compiled.primitives.filter(p => p.type === 'path');
    expect(paths).toHaveLength(2);
    const ends = paths.map(lineTo).filter((p): p is [number, number] => !!p).map(p => p[0]).sort((a, b) => a - b);
    // 中层 A 全局 ≈ 100；最内层 A 全局 ≈ 200
    expect(Math.abs(ends[0] - 100)).toBeLessThan(30);
    expect(Math.abs(ends[1] - 200)).toBeLessThan(30);
  });

  it('local_namespace_at_translate_cross_frame_lookup：scope at-translate of=外层 id 在内层 localNamespace 中走 inside-out 命中', () => {
    const ir = scene([
      { type: 'node', id: 'rootNode', position: [0, 0], text: 'root' },
      {
        type: 'scope',
        localNamespace: true,
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'at-translate', direction: 'right', of: 'rootNode', distance: 50 }],
            children: [
              { type: 'node', id: 'inner', position: [0, 0], text: 'I' },
            ],
          },
        ],
      },
    ]);
    const { warnings } = compileWithWarnings(ir);
    // at-translate 解析成功 → 不发 AT_TARGET_UNRESOLVED warn
    expect(warnings.filter(w => w.code === 'AT_TARGET_UNRESOLVED')).toHaveLength(0);
  });

  it('duplicate_across_frames_no_warn：localNamespace 内外同 id 不算 duplicate', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'outer' },
      {
        type: 'scope',
        localNamespace: true,
        children: [
          { type: 'node', id: 'A', position: [100, 0], text: 'inner' },
        ],
      },
    ]);
    const { warnings } = compileWithWarnings(ir);
    expect(warnings.filter(w => w.code === 'DUPLICATE_NODE_ID')).toHaveLength(0);
  });
});

describe('scope.id 始终注册到父 frame', () => {
  it('scope_id_registered_in_parent_with_local_namespace：scope.id 外部可见、内部 node id 只在子 frame', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'cluster',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 80, y: 0 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'cluster' },
        ],
      },
    ]);
    const { warnings } = compileWithWarnings(ir);
    // cluster 必须解析成功（在父 frame）；A 在内层 frame 不被外层访问
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);

    // 进一步：外层 path 引用内层 id 'A' 触发 warn
    const ir2 = scene([
      {
        type: 'scope',
        id: 'cluster2',
        localNamespace: true,
        children: [{ type: 'node', id: 'B', position: [50, 0], text: 'B' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const { warnings: w2 } = compileWithWarnings(ir2);
    expect(w2.some(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toBe(true);
  });

  it('localNamespace=false（默认）：scope.id 与子 id 都注册到同一 frame，子可见外可见', () => {
    const ir = scene([
      {
        type: 'scope',
        children: [
          { type: 'node', id: 'flat', position: [0, 0], text: 'F' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'flat' },
        ],
      },
    ]);
    const { warnings } = compileWithWarnings(ir);
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
  });
});

describe('GroupPrim 形态仍随 localNamespace 不变（仅命名空间隔离，scope.transforms 透传不受影响）', () => {
  it('localNamespace=true + transforms 非空 → 仍产 GroupPrim 含 transforms', () => {
    const ir = scene([
      {
        type: 'scope',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 30, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = compiled.primitives.find(p => p.type === 'group');
    expect(group?.transforms).toEqual([{ kind: 'translate', x: 30, y: 0 }]);
  });
});
