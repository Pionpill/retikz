import { describe, expect, it } from 'vitest';

import type { GroupPrimitive, PathPrimitive, ScenePrimitive, TextMeasurer, TextPrimitive } from '../../src';
import { compileToScene } from '../../src/compile/compile';
import type { IRPath, IRScene } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const STROKE = '#13579b';

const measuredLabel: TextMeasurer = () => ({ width: 20, height: 10 });

type CoreCompileOptions = NonNullable<Parameters<typeof compileToScene>[1]>;

const compile = (ir: IRScene, options: CoreCompileOptions = {}) =>
  compileToScene(ir, { ...options, measureText: measuredLabel }).scene;

const horizontalHostLabelPath = (label: IRPath['label']): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      id: 'edge',
      label,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
      style: { stroke: STROKE },
    },
  ],
});

const strokeFragments = (primitives: ReadonlyArray<ScenePrimitive>): Array<PathPrimitive> =>
  flattenPrims(primitives).filter(
    (primitive): primitive is PathPrimitive => primitive.type === 'path' && primitive.stroke === STROKE,
  );

const textPrim = (primitives: ReadonlyArray<ScenePrimitive>, text: string): TextPrimitive => {
  const primitive = flattenPrims(primitives).find(
    (candidate): candidate is TextPrimitive =>
      candidate.type === 'text' && candidate.lines.some(line => line.text === text),
  );
  if (primitive === undefined) throw new Error(`missing text primitive '${text}'`);

  return primitive;
};

const firstMove = (path: PathPrimitive): [number, number] => {
  const command = path.commands.find(candidate => candidate.kind === 'move');
  if (command === undefined) throw new Error('missing move command');
  return command.to;
};

const lastLine = (path: PathPrimitive): [number, number] => {
  const command = [...path.commands].reverse().find(candidate => candidate.kind === 'line');
  if (command === undefined) throw new Error('missing line command');
  return command.to;
};

const coversX = (paths: ReadonlyArray<PathPrimitive>, x: number): boolean =>
  paths.some(path => {
    const from = firstMove(path);
    const to = lastLine(path);
    return from[1] === 0 && to[1] === 0 && Math.min(from[0], to[0]) <= x && x <= Math.max(from[0], to[0]);
  });

describe('行程 Path 标签中断', () => {
  it('在其测量的视觉框周围分割未填充的居中宿主标签', () => {
    const scene = compile(horizontalHostLabelPath({ text: 'host', sloped: true }));
    const fragments = strokeFragments(scene.primitives).sort((left, right) => firstMove(left)[0] - firstMove(right)[0]);

    expect(fragments).toHaveLength(2);
    expect(lastLine(fragments[0])[0]).toBeLessThanOrEqual(40);
    expect(firstMove(fragments[1])[0]).toBeGreaterThanOrEqual(60);
    expect(textPrim(scene.primitives, 'host').x).toBe(50);
    expect(flattenPrims(scene.primitives).some(primitive => 'id' in primitive && primitive.id === 'edge')).toBe(true);
  });

  it('在中断标签间隙的两侧添加默认的四单位间隙', () => {
    const defaultGap = compile(horizontalHostLabelPath({ text: 'default', sloped: true }));
    const noGap = compile(horizontalHostLabelPath({ text: 'none', sloped: true, gap: 0 }));
    const explicitGap = compile(horizontalHostLabelPath({ text: 'wide', sloped: true, gap: 8 }));
    const defaultFragments = strokeFragments(defaultGap.primitives).sort(
      (left, right) => firstMove(left)[0] - firstMove(right)[0],
    );
    const noGapFragments = strokeFragments(noGap.primitives).sort(
      (left, right) => firstMove(left)[0] - firstMove(right)[0],
    );
    const explicitGapFragments = strokeFragments(explicitGap.primitives).sort(
      (left, right) => firstMove(left)[0] - firstMove(right)[0],
    );

    expect(lastLine(defaultFragments[0])[0]).toBe(35.5);
    expect(firstMove(defaultFragments[1])[0]).toBe(64.5);
    expect(lastLine(noGapFragments[0])[0]).toBe(39.5);
    expect(firstMove(noGapFragments[1])[0]).toBe(60.5);
    expect(lastLine(explicitGapFragments[0])[0]).toBe(31.5);
    expect(firstMove(explicitGapFragments[1])[0]).toBe(68.5);
  });

  it.each([
    { side: 'top', reversed: false },
    { side: 'bottom', reversed: false },
    { side: 'top', reversed: true },
    { side: 'bottom', reversed: true },
  ] as const)('竖直路径断口跟随偏移标签：$side，反向=$reversed', ({ side, reversed }) => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          style: { stroke: STROKE },
          label: { text: 'offset', side, distance: 12, interrupt: true, gap: 4 },
          children: [
            { type: 'step', kind: 'move', to: [0, reversed ? 100 : 0] },
            { type: 'step', kind: 'line', to: [0, reversed ? 0 : 100] },
          ],
        },
      ],
    });
    const fragments = strokeFragments(scene.primitives);
    expect(fragments).toHaveLength(2);
    const boundaries = [lastLine(fragments[0])[1], firstMove(fragments[1])[1]].sort((a, b) => a - b);
    // 断口只覆盖实际标签高度和两端留白，不能把偏移量镜像到采样点另一侧
    expect(boundaries[1] - boundaries[0]).toBeCloseTo(10 + 2 * (4 + 0.5));
    if (side === 'top') expect(boundaries[1]).toBeLessThan(50);
    else expect(boundaries[0]).toBeGreaterThan(50);
  });

  it('将片段保留在一个具有 id、元和动画的逻辑路径所属模块之下', () => {
    const animation = {
      property: 'opacity' as const,
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 200,
    };
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          id: 'logical-edge',
          meta: { source: 'interruption' },
          animations: [animation],
          label: { text: 'owner', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
          style: { stroke: STROKE },
        },
      ],
    });
    const owner = scene.primitives.find(
      (primitive): primitive is GroupPrimitive => primitive.type === 'group' && primitive.id === 'logical-edge',
    );
    const fragments = strokeFragments(owner?.children ?? []);

    expect(owner?.meta).toEqual({ source: 'interruption' });
    expect(owner?.animations).toEqual([animation]);
    expect(fragments).toHaveLength(2);

    for (const fragment of fragments) {
      expect(fragment.id).toBeUndefined();
      expect(fragment.meta).toBeUndefined();
      expect(fragment.animations).toBeUndefined();
    }
  });

  it('将上述标签和显式错误覆盖保留为一笔连续描边', () => {
    const above = compile(horizontalHostLabelPath({ text: 'above', side: 'top' }));
    const disabled = compile(horizontalHostLabelPath({ text: 'disabled', sloped: true, interrupt: false }));

    expect(strokeFragments(above.primitives)).toHaveLength(1);
    expect(strokeFragments(disabled.primitives)).toHaveLength(1);
  });

  it('对宿主和步骤标签应用相同的中断行为', () => {
    const host = compile(horizontalHostLabelPath({ text: 'host', sloped: true }));
    const step = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'step', sloped: true } },
          ],
          style: { stroke: STROKE },
        },
      ],
    });

    expect(strokeFragments(host.primitives)).toHaveLength(2);
    expect(strokeFragments(step.primitives)).toHaveLength(2);
  });

  it('合并重叠的标签间隙而不是创建中间片段', () => {
    const scene = compile(
      horizontalHostLabelPath([
        { text: 'first', position: 0.45, sloped: true },
        { text: 'second', position: 0.55, sloped: true },
      ]),
    );

    expect(strokeFragments(scene.primitives)).toHaveLength(2);
  });

  it('使用整个多行标签块进行倾斜中断', () => {
    const vertical = (text: string | Array<string>) => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            label: { text, sloped: true },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [0, 100] },
            ],
            style: { stroke: STROKE },
          },
        ],
      };
      return compileToScene(ir, {
        measureText: value => ({ width: value.length * 4, height: 10, ascent: 8, descent: 2 }),
      }).scene;
    };

    const single = strokeFragments(vertical('single').primitives).sort(
      (left, right) => firstMove(left)[1] - firstMove(right)[1],
    );
    const multiScene = vertical(['first', 'second label']);
    const multi = strokeFragments(multiScene.primitives).sort(
      (left, right) => firstMove(left)[1] - firstMove(right)[1],
    );
    const hardBreakScene = vertical('first\nsecond label');

    expect(multi).toHaveLength(2);
    expect(lastLine(multi[0])[1]).toBeLessThan(lastLine(single[0])[1]);
    expect(firstMove(multi[1])[1]).toBeGreaterThan(firstMove(single[1])[1]);
    expect(textPrim(multiScene.primitives, 'first')).toBeDefined();
    expect(textPrim(multiScene.primitives, 'second label')).toBeDefined();
    expect(textPrim(hardBreakScene.primitives, 'first')).toBeDefined();
    expect(textPrim(hardBreakScene.primitives, 'second label')).toBeDefined();
  });

  it('夹住端点标签间隙，而不保留通过其文本框的可见描边', () => {
    const scene = compile(horizontalHostLabelPath({ text: 'start', position: 0, sloped: true }));
    const fragments = strokeFragments(scene.primitives);

    expect(fragments).toHaveLength(1);
    expect(firstMove(fragments[0])[0]).toBeGreaterThanOrEqual(10);
  });

  it('当其居中标签中断覆盖整个逻辑段时，省略短描边', () => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          label: { text: 'wide label', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
          style: { stroke: STROKE },
        },
      ],
    });

    expect(strokeFragments(scene.primitives)).toHaveLength(0);
  });

  it.each([
    {
      name: 'quadratic',
      commandKind: 'quad',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'curve', control: [50, -80], to: [100, 0], label: { text: 'q', sloped: true } },
            ],
            style: { stroke: STROKE },
          },
        ],
      } satisfies IRScene,
    },
    {
      name: 'cubic',
      commandKind: 'cubic',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'cubic',
                control1: [0, -80],
                control2: [100, -80],
                to: [100, 0],
                label: { text: 'c', sloped: true },
              },
            ],
            style: { stroke: STROKE },
          },
        ],
      } satisfies IRScene,
    },
    {
      name: 'arc',
      commandKind: 'arc',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'arc',
                startAngle: 0,
                endAngle: 180,
                radius: 50,
                label: { text: 'a', sloped: true },
              },
            ],
            style: { stroke: STROKE },
          },
        ],
      } satisfies IRScene,
    },
    {
      name: 'ellipse arc',
      commandKind: 'ellipseArc',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'ellipsePath',
                radius: { x: 60, y: 30 },
                label: { text: 'e', sloped: true },
              },
            ],
            style: { stroke: STROKE },
          },
        ],
      } satisfies IRScene,
    },
  ])('$name 在两个可见片段中都保留其命令形式', ({ commandKind, ir }) => {
    const fragments = strokeFragments(compile(ir).primitives);

    expect(fragments).toHaveLength(2);
    expect(fragments.every(fragment => fragment.commands.some(command => command.kind === commandKind))).toBe(true);
  });

  it('将碎片闭合边缘扩展为线，而不是留下重绘间隙的闭合命令', () => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          label: { text: 'close', position: 0.9, sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
            { type: 'step', kind: 'line', to: [100, 100] },
            { type: 'step', kind: 'cycle' },
          ],
          style: { stroke: STROKE },
        },
      ],
    });
    const fragments = strokeFragments(scene.primitives);

    expect(fragments).toHaveLength(2);
    expect(fragments.flatMap(fragment => fragment.commands).some(command => command.kind === 'close')).toBe(false);
  });

  it('当每个步骤拥有不同的间隙时，将重复的行出现分开', () => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'first', position: 0.25, sloped: true } },
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'second', position: 0.75, sloped: true } },
          ],
          style: { stroke: STROKE },
        },
      ],
    });
    const fragments = strokeFragments(scene.primitives);

    expect(fragments).toHaveLength(4);
    expect(coversX(fragments.slice(0, 2), 25)).toBe(false);
    expect(coversX(fragments.slice(2), 75)).toBe(false);
  });
});
