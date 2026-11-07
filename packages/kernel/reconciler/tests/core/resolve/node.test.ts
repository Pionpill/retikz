import { describe, expect, it } from 'vitest';

import type { RetikzCoreError } from '../../../../core/src/error';
import { RetikzCoreErrorCode } from '../../../../core/src/error';
import { resolveBoundaryRegistry, resolvePatternRegistry, resolveShapeRegistry } from '../../../../core/src/providers';
import { resolveNode } from '../../../../core/src/resolve/node';
import type { MergedScopeDefaults } from '../../../../core/src/resolve/style';
import { resolveScopeDefaults } from '../../../../core/src/resolve/style';
import type { IRNode, IRScene } from '../../../../core/src/schemas';
import { compileTestResult } from '../../helpers/compilation';

const node = (overrides: Partial<IRNode> = {}): IRNode => ({
  type: 'node',
  position: [0, 0],
  ...overrides,
});

const sceneWith = (child: IRNode): IRScene => ({
  type: 'scene',
  version: 1,
  children: [child],
});

const resolve = (source: IRNode, scopeDefaults: MergedScopeDefaults = {}, rootFontSize = 16) =>
  resolveNode(source, {
    nodeDistance: 24,
    rootFontSize,
    gatingOn: false,
    scopeDefaults,
    mode: 'light',
    shapeRegistry: resolveShapeRegistry(),
    boundaryRegistry: resolveBoundaryRegistry(),
    patternRegistry: resolvePatternRegistry(),
    round: value => value,
    irPath: [],
    warn: () => {},
    labelDistance: 12,
  });

describe('resolveNode', () => {
  it.each([false, true])('解析正文与标签字体并保留缩放顺序，混排=%s', mixed => {
    const source: IRNode = {
      type: 'node',
      scale: { x: 2, y: 3 },
      style: { font: { size: '2em', weight: 'bold', family: 'serif' } },
      text: [
        mixed ? { segments: [{ text: 'inherited' }] } : 'inherited',
        { text: 'absolute', font: { size: 12 } },
        { text: 'relative', font: { size: '0.5em' } },
        { text: 'root', font: { size: '1rem' } },
      ],
      label: { text: [{ text: 'label', font: { size: '1em' } }], font: { size: '0.5em', weight: 'normal' } },
    };
    const before = structuredClone(source);
    const result = resolve(source, {}, 20);
    expect(result.text?.font).toEqual({ size: 80, weight: 700, family: 'serif', style: undefined });
    expect(result.text?.lineHeight).toBe(96);
    expect(result.text?.lines.map(line => line.segments)).toMatchObject([
      [{ text: 'inherited', font: { size: 80, weight: 700 } }],
      [{ text: 'absolute', font: { size: 24 } }],
      [{ text: 'relative', font: { size: 40 } }],
      [{ text: 'root', font: { size: 40 } }],
    ]);
    expect(result.labels).toMatchObject([
      {
        text: {
          font: { size: 40, weight: 400 },
          lines: [{ segments: [{ text: 'label', font: { size: 40, weight: 400 } }] }],
        },
      },
    ]);
    expect(source).toEqual(before);
  });

  it('节点填充绑定图案实现与默认尺寸，描边保留纯色且不修改源配置', () => {
    const source = node({ style: { fill: { kind: 'pattern', shape: 'dots' }, stroke: 'red' } });
    const result = resolve(source);

    expect(result.style.fill).toMatchObject({
      kind: 'paint',
      spec: { kind: 'pattern', shape: 'dots' },
      pattern: { name: 'dots', size: 8, definition: { emit: expect.any(Function) } },
    });
    expect(result.style.stroke).toBe('red');
    expect(source.style?.fill).toEqual({ kind: 'pattern', shape: 'dots' });
  });

  it('节点描边保留渐变配置，未设置的填充保持缺省', () => {
    const source = node({
      style: {
        stroke: {
          kind: 'linearGradient',
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        },
      },
    });
    const result = resolve(source);

    expect(result.style.fill).toBe('transparent');
    expect(result.style.stroke).toEqual({ kind: 'paint', spec: source.style?.stroke });
  });

  it('在 Core 解析阶段补齐局部原点且不修改 Source', () => {
    const source: IRNode = { type: 'node' };

    expect(resolve(source).layout.position).toEqual([0, 0]);
    expect(source).not.toHaveProperty('position');
  });

  it('扩展数字和类似 CSS 的框间距，同时保留显式零', () => {
    expect(
      resolve(
        node({
          layout: { padding: 3, margin: { y: 5, bottom: 0 } },
        }),
      ).layout,
    ).toMatchObject({
      padding: { top: 3, right: 3, bottom: 3, left: 3 },
      margin: { top: 5, right: 0, bottom: 0, left: 0 },
    });

    expect(
      resolve(
        node({
          layout: { padding: { default: 2, x: 4, left: 1 } },
        }),
      ).layout.padding,
    ).toEqual({
      top: 2,
      right: 4,
      bottom: 2,
      left: 1,
    });
  });

  it('扩展节点大小和比例简写，同时保留显式零', () => {
    expect(
      resolve(
        node({
          scale: 2,
          layout: { minimumSize: 12 },
        }),
      ).layout,
    ).toMatchObject({
      minimumSize: { width: 24, height: 24 },
    });

    expect(
      resolve(
        node({
          scale: { default: 3, y: 1 },
          layout: { minimumSize: { default: 10, width: 0 } },
        }),
      ).layout,
    ).toMatchObject({
      minimumSize: { width: 0, height: 10 },
    });
  });

  it('在解析阶段完成非等比尺寸缩放且不修改输入', () => {
    const source = node({
      scale: { x: 2, y: 3 },
      layout: {
        padding: { top: 1, right: 2, bottom: 0, left: 4 },
        margin: { x: 5, y: 6 },
        minimumSize: { width: 10, height: 20 },
        width: 40,
        maxTextWidth: 30,
      },
    });
    const before = structuredClone(source);
    expect(resolve(source).layout).toMatchObject({
      padding: { top: 3, right: 4, bottom: 0, left: 8 },
      margin: { top: 18, right: 10, bottom: 18, left: 10 },
      minimumSize: { width: 20, height: 60 },
      width: 80,
    });
    expect(resolve({ ...source, text: 'width' }).text?.maxTextWidth).toBe(60);
    expect(source).toEqual(before);
    expect(resolve(node({ scale: { x: 2, y: 3 } })).layout.padding).toEqual({
      top: 24,
      right: 16,
      bottom: 24,
      left: 16,
    });
  });

  it('缩放输入与直接给定有效尺寸得到相同的换行和绘制结果', () => {
    const scaled = node({
      text: 'alpha beta gamma delta',
      scale: { x: 2, y: 3 },
      style: { font: { size: 10 } },
      layout: { padding: 2, margin: 3, minimumSize: 10, width: 50, maxTextWidth: 30, lineHeight: 12 },
    });
    const effective = node({
      text: 'alpha beta gamma delta',
      style: { font: { size: 20 } },
      layout: {
        padding: { x: 4, y: 6 },
        margin: { x: 6, y: 9 },
        minimumSize: { width: 20, height: 30 },
        width: 100,
        maxTextWidth: 60,
        lineHeight: 36,
      },
    });
    expect(compileTestResult(sceneWith(scaled)).scene).toEqual(compileTestResult(sceneWith(effective)).scene);
  });

  it('拒绝低于有效最小可见宽度的 layout.width', () => {
    expect(() => resolve(node({ layout: { width: 40, minimumSize: { width: 50 } } }))).toThrowError(
      expect.objectContaining({ code: RetikzCoreErrorCode.Resolve }) as RetikzCoreError,
    );

    expect(resolve(node({ layout: { width: 50, minimumSize: { width: 50 } } })).layout.width).toBe(50);
  });

  it('提供 Node 默认值，而不更改不相关的 IR 字段', () => {
    const source = node({ id: 'node-a', text: 'A' });

    expect(resolve(source)).toMatchObject({
      id: 'node-a',
      aliasIds: [],
      animations: [],
      labels: [],
      layout: {
        position: [0, 0],
        padding: { top: 8, right: 8, bottom: 8, left: 8 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        minimumSize: { width: 0, height: 0 },
        rotate: 0,
      },
      text: {
        lines: [{ plainText: 'A', segments: [{ text: 'A', font: { size: 16 } }], mixed: false, hasMath: false }],
        font: { size: 16 },
        lineHeight: 19.2,
        textAlign: 'middle',
      },
      style: { dashPattern: [], shadow: undefined },
    });
  });

  it('规范化文本简写，而不删除空字符串或重新排序行', () => {
    expect(resolve(node({ text: '' })).text?.lines.map(line => line.plainText)).toEqual(['']);

    const lines: NonNullable<IRNode['text']> = ['first', { text: 'second' }];

    expect(resolve(node({ text: lines })).text?.lines.map(line => line.plainText)).toEqual(['first', 'second']);
    expect(lines).toEqual(['first', { text: 'second' }]);
  });

  it('将有效标签默认值具体化到每个规范标签中', () => {
    const frame = resolveScopeDefaults({
      style: { color: 'red' },
      node: {
        label: {
          textColor: 'blue',
          opacity: 0.5,
          font: { family: 'default', size: 20, weight: 'bold' },
        },
      },
      path: {
        label: {
          textColor: 'blue',
          opacity: 0.5,
          font: { family: 'default', size: 20, weight: 'bold' },
        },
      },
    });
    const resolved = resolve(node({ label: { text: 'x', font: { size: 10 } } }), frame);

    expect(resolved.labels).toMatchObject([
      {
        text: { lines: [{ plainText: 'x' }], color: 'blue', font: { family: 'default', size: 10, weight: 700 } },
        align: 'middle',
        position: 'top',
        placement: 'outside',
        distance: 12,
        opacity: 0.5,
      },
    ]);
  });

  it('填充规范标签默认值，而不替换明确的零或 false', () => {
    expect(resolve(node({ label: { text: 'default' } })).labels).toMatchObject([
      {
        text: { lines: [{ plainText: 'default' }] },
        align: 'middle',
        position: 'top',
        placement: 'outside',
        distance: 12,
      },
    ]);

    expect(
      resolve(
        node({
          label: {
            text: 'explicit',
            position: { boundary: 'left', fraction: 0 },
            placement: 'inside',
            distance: 0,
            keepUpright: false,
            pin: false,
          },
        }),
      ).labels,
    ).toMatchObject([
      {
        text: { lines: [{ plainText: 'explicit' }] },
        align: 'middle',
        position: { boundary: 'left', fraction: 0 },
        placement: 'inside',
        distance: 0,
        keepUpright: false,
        pin: false,
      },
    ]);
  });

  it('默认规范标签对齐到中间并保留显式对齐', () => {
    expect(resolve(node({ label: { text: 'default' } })).labels).toMatchObject([
      {
        text: { lines: [{ plainText: 'default' }] },
        position: 'top',
        placement: 'outside',
        distance: 12,
        align: 'middle',
      },
    ]);

    expect(resolve(node({ label: { text: 'explicit', align: 'start' } })).labels).toMatchObject([
      {
        text: { lines: [{ plainText: 'explicit' }] },
        position: 'top',
        placement: 'outside',
        distance: 12,
        align: 'start',
      },
    ]);
  });

  it('当其位置省略 1 时，填充边界标签分数', () => {
    expect(resolve(node({ label: { text: 'boundary', position: { boundary: 'right' } } })).labels).toMatchObject([
      {
        text: { lines: [{ plainText: 'boundary' }] },
        align: 'middle',
        position: { boundary: 'right', fraction: 0.5 },
        placement: 'outside',
        distance: 12,
      },
    ]);
  });

  it('解析 Node 标量默认值以及静态虚线和阴影形式', () => {
    const defaults = resolve(node({ text: '' }));

    expect(defaults.text?.textAlign).toBe('middle');
    expect(defaults.layout.rotate).toBe(0);
    expect(
      resolve(
        node({
          style: { dashed: true, dotted: true },
        }),
      ).style.dashPattern,
    ).toEqual([4, 2]);
    expect(
      resolve(
        node({
          style: { dashPattern: [0, 2], dashed: true, dotted: true },
        }),
      ).style.dashPattern,
    ).toEqual([0, 2]);
    expect(
      resolve(
        node({
          style: { dashed: true, dotted: true },
        }),
      ).style,
    ).not.toHaveProperty('dashed');
    expect(
      resolve(
        node({
          style: { dashed: true, dotted: true },
        }),
      ).style,
    ).not.toHaveProperty('dotted');
    expect(
      resolve(
        node({
          style: { shadow: { offsetX: 0, offsetY: 0, opacity: 0 } },
        }),
      ).style.shadow,
    ).toEqual({
      offsetX: 0,
      offsetY: 0,
      opacity: 0,
      color: 'rgba(0,0,0,0.5)',
    });
  });

  it('返回规范节点旁边的形状和边界提供者解析结果', () => {
    const resolved = resolve(node({ shape: 'rectangle', boundary: 'circle' }));

    expect(resolved.shape.name).toBe('rectangle');
    expect(resolved.shape.definition.name).toBe('rectangle');
    expect(resolved.boundary.name).toBe('circle');
    expect(resolved.boundary.definition.name).toBe('circle');
  });

  it('将紧凑和扩展的 Node 形式编译为相同的 Scene', () => {
    const compact = node({
      id: 'equivalent',
      text: 'A',
      scale: { default: 2, y: 1 },
      layout: {
        padding: { default: 2, x: 4, left: 0 },
        margin: { default: 3, y: 5, bottom: 0 },
        minimumSize: { default: 10, width: 0 },
      },
    });
    const expanded = node({
      id: 'equivalent',
      text: 'A',
      scale: { x: 2, y: 1 },
      layout: {
        padding: { top: 2, right: 4, bottom: 2, left: 0 },
        margin: { top: 5, right: 3, bottom: 0, left: 3 },
        minimumSize: { width: 0, height: 10 },
      },
    });

    expect(compileTestResult(sceneWith(compact)).scene).toEqual(compileTestResult(sceneWith(expanded)).scene);
  });

  it('将紧凑的 Node 静态形式编译为与规范 IR 等效项相同的 Scene', () => {
    const compact = node({
      text: 'A',
      label: { text: 'L' },
      style: { dashed: true, shadow: { offsetX: 0, offsetY: 0, opacity: 0 } },
    });
    const expanded = node({
      text: ['A'],
      label: [{ text: 'L', position: 'top', placement: 'outside' }],
      rotate: 0,
      style: { dashPattern: [4, 2], shadow: { offsetX: 0, offsetY: 0, opacity: 0, color: 'rgba(0,0,0,0.5)' } },
      layout: { textAlign: 'middle' },
    });

    expect(compileTestResult(sceneWith(compact)).scene).toEqual(compileTestResult(sceneWith(expanded)).scene);
  });
});
