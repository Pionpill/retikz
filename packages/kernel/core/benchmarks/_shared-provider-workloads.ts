import type { GroupPrimitive, PathCommand, ScenePrimitive } from '../src/contract';

/** Provider快照的原始输入及独立预期；undefined仅出现在输入对象的可选字段 */
export type SharedProviderWorkload = {
  /** 可重复消费的原图元列表，标记物化直接消费此数组 */
  primitives: Array<ScenePrimitive>;
  /** 模拟shape provider返回的可重复iterable，只负责交付已准备图元 */
  emitted: Iterable<ScenePrimitive>;
  /** 允许绘制引用的资源，不包含元数据中的任意引用 */
  allowedResourceIds: ReadonlySet<string>;
  /** 省略对象undefined字段后的已知完整输出 */
  expected: Array<ScenePrimitive>;
};

/** 预置一份可重放iterable，provider几何生成不属于消费方快照成本 */
const createWorkload = (
  primitives: Array<ScenePrimitive>,
  expected: Array<ScenePrimitive>,
): SharedProviderWorkload => ({
  primitives,
  expected,
  allowedResourceIds: new Set(['fill-resource', 'stroke-resource']),
  emitted: {
    *[Symbol.iterator]() {
      yield* primitives;
    },
  },
});

/** 构造rect/ellipse/path/text均匀混合的输出树，三层组不计入叶数 */
export const createSharedProviderTreeWorkload = (count: 8 | 128): SharedProviderWorkload => {
  let primitives: Array<ScenePrimitive> = [];
  let expected: Array<ScenePrimitive> = [];
  for (let index = 0; index < count; index++) {
    // 元数据允许描述任意JSON引用，不能被误判为provider声明的资源
    const meta = { kind: 'resourceRef', id: 'metadata-only', clipRef: 'metadata-clip', resources: ['metadata'] };
    if (index % 4 === 0) {
      primitives.push({
        type: 'rect',
        id: `rect-${index}`,
        meta,
        x: index,
        y: 2,
        width: 3,
        height: 4,
        fill: { kind: 'resourceRef', id: 'fill-resource' },
        stroke: { kind: 'resourceRef', id: 'stroke-resource' },
        opacity: 0,
        fillOpacity: 0.5,
        strokeWidth: 2,
        cornerRadius: undefined,
        shadow: { offsetX: -1, offsetY: 2, blur: 3, color: '#123' },
      });
      expected.push({
        type: 'rect',
        id: `rect-${index}`,
        meta: { ...meta, resources: ['metadata'] },
        x: index,
        y: 2,
        width: 3,
        height: 4,
        fill: { kind: 'resourceRef', id: 'fill-resource' },
        stroke: { kind: 'resourceRef', id: 'stroke-resource' },
        opacity: 0,
        fillOpacity: 0.5,
        strokeWidth: 2,
        shadow: { offsetX: -1, offsetY: 2, blur: 3, color: '#123' },
      });
    } else if (index % 4 === 1) {
      primitives.push({
        type: 'ellipse',
        id: `ellipse-${index}`,
        meta,
        cx: index,
        cy: 2,
        rx: 3,
        ry: 4,
        rotate: 15,
        fill: { kind: 'contextStroke' },
        stroke: undefined,
      });
      expected.push({
        type: 'ellipse',
        id: `ellipse-${index}`,
        meta: { ...meta, resources: ['metadata'] },
        cx: index,
        cy: 2,
        rx: 3,
        ry: 4,
        rotate: 15,
        fill: { kind: 'contextStroke' },
      });
    } else if (index % 4 === 2) {
      primitives.push({
        type: 'path',
        id: `path-${index}`,
        meta,
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [index, 3] },
        ],
        fill: 'none',
        stroke: { kind: 'resourceRef', id: 'stroke-resource' },
        dashPattern: [2, 1],
        arrowEnd: undefined,
      });
      expected.push({
        type: 'path',
        id: `path-${index}`,
        meta: { ...meta, resources: ['metadata'] },
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [index, 3] },
        ],
        fill: 'none',
        stroke: { kind: 'resourceRef', id: 'stroke-resource' },
        dashPattern: [2, 1],
      });
    } else {
      primitives.push({
        type: 'text',
        id: `text-${index}`,
        meta,
        x: index,
        y: 2,
        lines: [
          { text: 'shared', fontSize: undefined },
          { text: 'provider', opacity: 0.5 },
        ],
        fontSize: 10,
        lineHeight: 12,
        measuredWidth: 40,
        measuredHeight: 24,
        align: 'start',
        baseline: 'alphabetic',
        fill: '#456',
        fontFamily: undefined,
      });
      expected.push({
        type: 'text',
        id: `text-${index}`,
        meta: { ...meta, resources: ['metadata'] },
        x: index,
        y: 2,
        lines: [{ text: 'shared' }, { text: 'provider', opacity: 0.5 }],
        fontSize: 10,
        lineHeight: 12,
        measuredWidth: 40,
        measuredHeight: 24,
        align: 'start',
        baseline: 'alphabetic',
        fill: '#456',
      });
    }
  }
  for (let depth = 0; depth < 3; depth++) {
    const group: GroupPrimitive = {
      type: 'group',
      id: `group-${depth}`,
      meta: { depth },
      transforms: [{ kind: 'translate', x: 1, y: -2 }],
      clipRef: undefined,
      children: primitives,
    };
    primitives = [group];
    expected = [
      {
        type: 'group',
        id: `group-${depth}`,
        meta: { depth },
        transforms: [{ kind: 'translate', x: 1, y: -2 }],
        children: expected,
      },
    ];
  }
  return createWorkload(primitives, expected);
};

/** 只扩容单条provider路径的命令数，不通过重复快照调用放大成本 */
export const createSharedProviderPathWorkload = (count: 16 | 1024): SharedProviderWorkload => {
  const commands: Array<PathCommand> = [{ kind: 'move', to: [0, 0] }];
  const expectedCommands: Array<PathCommand> = [{ kind: 'move', to: [0, 0] }];
  for (let index = 1; index < count; index++) {
    commands.push({ kind: 'line', to: [index, index % 5] });
    expectedCommands.push({ kind: 'line', to: [index, index % 5] });
  }
  return createWorkload(
    [
      {
        type: 'path',
        id: 'long-path',
        commands,
        fill: 'none',
        stroke: { kind: 'resourceRef', id: 'stroke-resource' },
        strokeWidth: 2,
        arrowStart: undefined,
      },
    ],
    [
      {
        type: 'path',
        id: 'long-path',
        commands: expectedCommands,
        fill: 'none',
        stroke: { kind: 'resourceRef', id: 'stroke-resource' },
        strokeWidth: 2,
      },
    ],
  );
};
