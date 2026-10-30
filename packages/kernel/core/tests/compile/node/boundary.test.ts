import { describe, expect, it } from 'vitest';

import * as core from '../../../src';
import { NamespaceStack } from '../../../src/compile/namespace';
import { angleBoundaryOf, boundaryPointOf, compileNodeResolution } from '../../../src/compile/node';
import { resolveAnchor } from '../../../src/compile/reference';
import { createPositionResolveContext } from '../../../src/compile/reference/position-context';
import { resolveBoundaryRegistry } from '../../../src/providers/boundary';
import { resolvePatternRegistry } from '../../../src/providers/pattern';
import { BUILTIN_SHAPES } from '../../../src/providers/shape';
import { resolveNode } from '../../../src/resolve/node';
import type { IRNode } from '../../../src/schemas';
import { BuiltinBoundary, BoundarySchema } from '../../../src/schemas';
import { NodeSchema } from '../../../src/schemas';
import { NodeTargetSchema } from '../../../src/schemas';

describe('BoundarySchema', () => {
  it('解析保留关键字和注册名称', () => {
    expect(BoundarySchema.parse('shape')).toBe('shape');
    expect(BoundarySchema.parse('circle')).toBe('circle');
    expect(BoundarySchema.parse('rectangle')).toBe('rectangle');
  });

  it('解析嵌套的{type，params}', () => {
    expect(BoundarySchema.parse({ type: 'star', params: { points: 5 } })).toEqual({
      type: 'star',
      params: { points: 5 },
    });
  });

  it('拒绝空字符串', () => {
    expect(() => BoundarySchema.parse('')).toThrow();
  });

  it('公开保留关键字常量', () => {
    expect(BuiltinBoundary.Self).toBe('shape');
    expect(BuiltinBoundary.Circle).toBe('circle');
  });
});

describe('边界 IR 字段', () => {
  it('NodeSchema 接受边界', () => {
    const n = NodeSchema.parse({ type: 'node', id: 'a', shape: 'rectangle', position: [0, 0], boundary: 'circle' });

    expect(n.boundary).toBe('circle');
  });

  it('NodeSchema 边界可选', () => {
    const n = NodeSchema.parse({ type: 'node', id: 'a', position: [0, 0] });

    expect(n.boundary).toBeUndefined();
  });

  it('NodeTargetSchema 接受边界', () => {
    const t = NodeTargetSchema.parse({ id: 'a', boundary: 'shape' });

    expect(t.boundary).toBe('shape');
  });
});

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 0,
  height: 0,
  ascent: 0,
});

/** 供边界单元测试直接消费 Source IR 的 Node 布局边界 */
const layoutBoundaryNode = (node: IRNode, namespaceStack: NamespaceStack) =>
  (() => {
    const boundaries = resolveBoundaryRegistry();
    const resolution = resolveNode(node, {
      scopeDefaults: {},
      mode: 'light',
      shapeRegistry: BUILTIN_SHAPES,
      boundaryRegistry: boundaries,
      patternRegistry: resolvePatternRegistry(),
      round: value => value,
      irPath: [],
      warn: () => {},
      labelDistance: 12,
    });

    return compileNodeResolution(resolution, {
      measureText,
      positionContext: createPositionResolveContext({
        lookupReference: id => namespaceStack.lookupReference(id),
        nodeDistance: 24,
      }),
    }).layout;
  })();

describe('边界感知边界/规范', () => {
  it("boundaryPointOf 缺省参数等价于 'shape'", () => {
    const namespaceStack = new NamespaceStack();
    const layout = layoutBoundaryNode(
      {
        type: 'node',
        id: 'rect1',
        shape: 'rectangle',
        position: [0, 0],
      },
      namespaceStack,
    );
    const toward: [number, number] = [100, 0];

    // 缺省与显式 'shape' 结果相同
    expect(boundaryPointOf(layout, toward)).toEqual(boundaryPointOf(layout, toward, 'shape'));
  });

  it('angleBoundaryOf 缺省与显式 shape 等价', () => {
    const namespaceStack = new NamespaceStack();
    const layout = layoutBoundaryNode(
      {
        type: 'node',
        id: 'r1',
        shape: 'rectangle',
        position: [0, 0],
      },
      namespaceStack,
    );

    expect(angleBoundaryOf(layout, 0)).toEqual(angleBoundaryOf(layout, 0, 'shape'));
    expect(angleBoundaryOf(layout, 90)).toEqual(angleBoundaryOf(layout, 90, 'shape'));
  });

  it('tight boundary 在 fit / gap 后应用 margin，自动端点与标准/数字 anchor 一致', () => {
    const namespaceStack = new NamespaceStack();
    const layout = layoutBoundaryNode(
      {
        type: 'node',
        id: 'polygon-margin',
        shape: { type: 'polygon', params: { sides: 5 } },
        boundary: { type: 'circle', params: { fit: 'tight', gap: 2 } },
        position: [0, 0],
        layout: { margin: 8 },
      },
      namespaceStack,
    );
    const boundary = { type: 'circle', params: { fit: 'tight', gap: 2 } } as const;
    const automatic = boundaryPointOf(layout, [100, 0], boundary);
    const standard = resolveAnchor(layout, 'right', boundary);
    const numeric = resolveAnchor(layout, '0', boundary);

    expect(standard[0]).toBeCloseTo(automatic[0]);
    expect(standard[1]).toBeCloseTo(automatic[1]);
    expect(numeric[0]).toBeCloseTo(automatic[0]);
    expect(numeric[1]).toBeCloseTo(automatic[1]);
  });
});

// ─── 导出断言 + 补充象限 ──────────────────────────────────────────────────────

describe('公共导出+剩余象限', () => {
  it('从包根导出的 BuiltinBoundary / BoundarySchema', () => {
    expect(core.BuiltinBoundary.Self).toBe('shape');
    expect(core.BuiltinBoundary.Circle).toBe('circle');
    expect(core.BoundarySchema).toBeDefined();
    // BuiltinBoundary / IRBoundary 是类型，仅编译时可见，此处不再 runtime 断言
  });

  it('boundary_unregistered_throws: boundary 指向未注册 shape 且有 path 连到该节点时编译抛错', () => {
    // resolveBoundary 在 clipForTarget → boundaryPointOf 里被调用（有 path 才触发）
    const ir: core.IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'n',
          shape: 'rectangle',
          position: [0, 0],
          // 'nope' 既非保留字（shape/circle/rectangle/ellipse），又非内置 registry shape
          boundary: 'nope',
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [100, 0] },
            { type: 'step', kind: 'line', to: { id: 'n' } },
          ],
        },
      ],
    };

    expect(() => core.compileToScene(ir)).toThrow(/Unknown connection surface provider 'nope'/);
  });

  it('roundtrip_self_describing: 含 node.boundary / 端点 boundary 的 IR JSON 序列化后再 schema parse 等价', () => {
    const ir: core.IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'node',
          shape: { type: 'polygon', params: { sides: 5 } },
          position: [0, 0],
          boundary: 'circle',
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [100, 0] },
            { type: 'step', kind: 'line', to: { id: 'node', boundary: 'shape' } },
          ],
        },
      ],
    };
    const roundtripped = core.SceneSchema.parse(JSON.parse(JSON.stringify(ir)));

    // 节点 boundary 字段正确保留
    const node = roundtripped.children.find(c => c.type === 'node') as core.IRNode;

    expect(node.boundary).toBe('circle');

    // path 端点 boundary 字段正确保留
    const path = roundtripped.children.find(c => c.type === 'path') as core.IRPath;
    const lineStep = path.children.find(s => s.kind === 'line');

    expect(lineStep).toBeDefined();

    const to = lineStep!.to as core.IRNodeTarget;

    expect(to.boundary).toBe('shape');
  });

  it('boundary_noop_in_between: between 端点带 boundary 编译不报错，正常产出路径', () => {
    // between 端点被 clipForTarget 处理为固定中点（refPointOfTarget），boundary 字段被忽略不引发 throw
    const ir: core.IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 50] },
            {
              type: 'step',
              kind: 'line',
              to: {
                between: [
                  // between 的子端点是 NodeTarget，带 boundary 字段（boundary 在 between 路径不触发 resolveBoundary）
                  { id: 'A', boundary: 'circle' },
                  { id: 'B' },
                ],
                fraction: 0.5,
              },
            },
          ],
        },
      ],
    };

    expect(() => core.compileToScene(ir)).not.toThrow();

    const scene = core.compileToScene(ir).scene;

    // 产出包含路径
    const paths = scene.primitives.filter(p => p.type === 'path');

    expect(paths.length).toBeGreaterThan(0);
  });
});
