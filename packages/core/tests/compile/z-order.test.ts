import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning, IR } from '../../src';
import type { GroupPrim, ScenePrimitive } from '../../src/primitive';

// ---------------------------------------------------------------------------
// helpers：构造测试 IR
// ---------------------------------------------------------------------------

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

/** 文本性 node（无 text、默认 rectangle、无 rotate）→ emit 恰好 1 个 RectPrim */
const node = (position: [number, number]): IR['children'][number] => ({ type: 'node', position });

/** 直线 path（move [0,0] → line to）→ emit 1 个 PathPrim */
const line = (to: [number, number]): IR['children'][number] => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to },
  ],
});

/** 取顶层第一个 GroupPrim（断言用）；找不到则失败 */
const firstGroup = (result: { primitives: Array<ScenePrimitive> }): GroupPrim => {
  const group = result.primitives.find((p): p is GroupPrim => p.type === 'group');
  if (!group) throw new Error('expected a top-level GroupPrim but found none');
  return group;
};

/** 递归收集所有 primitive 的 type（含每个 GroupPrim.children），用于占位泄漏检查 */
const collectTypes = (primitives: Array<ScenePrimitive>): Array<string> => {
  const types: Array<string> = [];
  for (const prim of primitives) {
    types.push(prim.type);
    if (prim.type === 'group') types.push(...collectTypes(prim.children));
  }
  return types;
};

/** 静默 onWarn，避免 happy path 误用默认 console.warn */
const silent = { onWarn: () => {} };

// ===========================================================================
// Happy path
// ===========================================================================

describe('compile primitives 顺序严格等于 IR 声明顺序', () => {
  it('顶层 node / path 交错时 primitives 顺序等于 IR 声明顺序', () => {
    const ir = scene([
      node([0, 0]),
      line([10, 0]),
      node([20, 0]),
      line([30, 0]),
      node([40, 0]),
    ]);
    const types = compileToScene(ir, silent).primitives.map(p => p.type);
    expect(types).toEqual(['rect', 'path', 'rect', 'path', 'rect']);
  });

  it('夹在两个 node 之间的 path 不再被顶到末尾', () => {
    const ir = scene([node([0, 0]), line([10, 0]), node([20, 0])]);
    const types = compileToScene(ir, silent).primitives.map(p => p.type);
    expect(types).toEqual(['rect', 'path', 'rect']);
  });

  it('无 transform 的 scope 内部 node / path 交错时 group 子序等于 IR 声明顺序', () => {
    const ir = scene([
      { type: 'scope', children: [node([0, 0]), line([10, 0]), node([20, 0])] },
    ]);
    const result = compileToScene(ir, silent);
    expect(result.primitives.filter(p => p.type === 'group')).toHaveLength(1);
    const group = firstGroup(result);
    expect(group.children.map(p => p.type)).toEqual(['rect', 'path', 'rect']);
  });
});

// ===========================================================================
// 边界
// ===========================================================================

describe('compile 占位回填的边界场景', () => {
  it('顶层仅一条 path 时占位回填后 primitives 为单元素 path', () => {
    const ir = scene([line([10, 0])]);
    const types = compileToScene(ir, silent).primitives.map(p => p.type);
    expect(types).toEqual(['path']);
  });

  it('无 transform 的 scope 仅含一条可解析 path 时不被剪枝且 group 含该 path', () => {
    const ir = scene([{ type: 'scope', children: [line([10, 0])] }]);
    const result = compileToScene(ir, silent);
    // scope 未被 prune：顶层仍得到一个 GroupPrim
    expect(result.primitives.filter(p => p.type === 'group')).toHaveLength(1);
    const group = firstGroup(result);
    expect(group.children.map(p => p.type)).toEqual(['path']);
  });

  it('多层无 transform scope 嵌套时每层 group 各自保住声明顺序', () => {
    const ir = scene([
      {
        type: 'scope',
        children: [
          node([0, 0]),
          {
            type: 'scope',
            children: [node([5, 0]), line([15, 0]), node([25, 0])],
          },
          line([35, 0]),
        ],
      },
    ]);
    const result = compileToScene(ir, silent);
    const outer = firstGroup(result);
    // 外层：node、内层 scope（group）、path → ['rect', 'group', 'path']
    expect(outer.children.map(p => p.type)).toEqual(['rect', 'group', 'path']);
    const inner = outer.children.find((p): p is GroupPrim => p.type === 'group');
    if (!inner) throw new Error('expected a nested GroupPrim');
    // 内层：node、path、node → 声明序保住
    expect(inner.children.map(p => p.type)).toEqual(['rect', 'path', 'rect']);
  });
});

// ===========================================================================
// 错误路径
// ===========================================================================

describe('compile path 解析失败时占位被移除且不泄漏', () => {
  it('path 引用未定义 id 时占位被移除且无空洞并仍发出 warning', () => {
    const ir = scene([
      node([0, 0]),
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'undefinedNode' } },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
      node([20, 0]),
    ]);
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(ir, { onWarn: w => warnings.push(w) });

    // 仍发出原有 warning
    expect(warnings.some(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toBe(true);

    // 占位被 splice 移除：输出里不存在 path-placeholder（强转 string 比较，避开公开 union 不含此 type）
    const types = result.primitives.map(p => p.type as string);
    expect(types).not.toContain('path-placeholder');

    // 两个 node 的 rect 仍按声明序在位、无空洞（toEqual 密集比较覆盖长度 / 内容 / undefined 空洞）
    expect(types).toEqual(['rect', 'rect']);
  });

  it('任意用例输出中递归遍历都不含 path-placeholder 占位对象', () => {
    const cases: Array<IR> = [
      scene([node([0, 0]), line([10, 0]), node([20, 0])]),
      scene([line([10, 0])]),
      scene([{ type: 'scope', children: [node([0, 0]), line([10, 0])] }]),
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 5, y: 3 }],
          children: [node([0, 0]), line([10, 0])],
        },
      ]),
      scene([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'undefinedNode' } },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ]),
    ];
    for (const ir of cases) {
      const result = compileToScene(ir, silent);
      expect(collectTypes(result.primitives)).not.toContain('path-placeholder');
    }
  });
});

// ===========================================================================
// 交互：transformed scope 内 path 仍 hoist（已知限制锁定）
// ===========================================================================

describe('compile transformed scope 内 path 仍被 hoist 到顶层末尾', () => {
  it('translate scope 内 path 被 hoist 出 group 落在 group 之前且端点含 translate 不双重应用', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 5, y: 3 }],
        children: [node([0, 0]), line([10, 0])],
      },
    ]);
    const result = compileToScene(ir, silent);

    // primitives 顺序：hoist 的 path 在前、scope 的 group 在后
    expect(result.primitives.map(p => p.type)).toEqual(['path', 'group']);

    // group 内只含 node 的 rect，不含 path
    const group = firstGroup(result);
    expect(group.children.map(p => p.type)).toEqual(['rect']);

    // hoist 的 path 是首个 primitive（落在该 scope 的 group 之前）
    const hoisted = result.primitives[0];
    expect(hoisted.type).toBe('path');

    // 端点坐标体现 translate（一次），不双重 apply：move [0,0]→[5,3]、line [10,0]→[15,3]
    if (hoisted.type !== 'path') throw new Error('expected first primitive to be a path');
    const moveCmd = hoisted.commands[0];
    const lineCmd = hoisted.commands[hoisted.commands.length - 1];
    if (moveCmd.kind !== 'move' || lineCmd.kind !== 'line') {
      throw new Error('expected move + line commands');
    }
    expect(moveCmd.to).toEqual([5, 3]);
    expect(lineCmd.to).toEqual([15, 3]);
  });

  it('transformed scope 内 path 的 Scene 输出形态被锁定', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 5, y: 3 }],
        children: [node([0, 0]), line([10, 0])],
      },
    ]);
    const result = compileToScene(ir, silent);
    // 锁定 primitives 的 type 序：hoist 的 path 在前、scope 的 group 在后
    expect(result.primitives.map(p => p.type)).toEqual(['path', 'group']);
    // 自包含锁定 hoist path 的完整形态（端点含 translate、落在 group 之前、不在 group 内）
    const hoisted = result.primitives[0];
    expect(hoisted).toMatchInlineSnapshot(`
      {
        "commands": [
          {
            "kind": "move",
            "to": [
              5,
              3,
            ],
          },
          {
            "kind": "line",
            "to": [
              15,
              3,
            ],
          },
        ],
        "dashPattern": undefined,
        "fill": "none",
        "fillOpacity": undefined,
        "fillRule": undefined,
        "opacity": undefined,
        "stroke": "currentColor",
        "strokeLinecap": undefined,
        "strokeLinejoin": undefined,
        "strokeOpacity": undefined,
        "strokeWidth": 1,
        "type": "path",
      }
    `);
  });

  it('两 node 之间夹只含 path 的 transformed scope 时 path hoist 到该 scope 的 group 之前', () => {
    const ir = scene([
      node([0, 0]),
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 5, y: 3 }],
        children: [line([10, 0])],
      },
      node([20, 0]),
    ]);
    const types = compileToScene(ir, silent).primitives.map(p => p.type);
    // node A 的 rect、hoist 的 path、scope 的（空）group、node B 的 rect
    // path 落在它所属 scope 的 group 之前；A / B 的 rect 仍按声明序（已知限制：path 相对其 group 提前）
    expect(types).toEqual(['rect', 'path', 'group', 'rect']);
  });
});
