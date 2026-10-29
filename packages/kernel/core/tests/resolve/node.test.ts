import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import type { RetikzCoreError } from '../../src/error';
import { RetikzCoreErrorCode } from '../../src/error';
import { resolveBoundaryRegistry } from '../../src/providers/boundary';
import { resolvePatternRegistry } from '../../src/providers/pattern';
import { resolveShapeRegistry } from '../../src/providers/shape';
import { resolveNode } from '../../src/resolve/node';
import type { MergedScopeDefaults } from '../../src/resolve/style';
import { resolveScopeDefaults } from '../../src/resolve/style';
import type { IRNode, IRScene } from '../../src/schemas';

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

const resolve = (source: IRNode, scopeDefaults: MergedScopeDefaults = {}) =>
  resolveNode(source, {
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
  it('节点填充绑定图案实现与默认尺寸，描边保留纯色且不修改源配置', () => {
    const source = node({ style: { fill: { kind: 'pattern', shape: 'dots' }, stroke: 'red' } });
    const result = resolve(source).node;

    expect(result.fill).toMatchObject({
      kind: 'paint',
      spec: { kind: 'pattern', shape: 'dots' },
      pattern: { name: 'dots', size: 8, definition: { emit: expect.any(Function) } },
    });
    expect(result.stroke).toBe('red');
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
    const result = resolve(source).node;

    expect(result.fill).toBeUndefined();
    expect(result.stroke).toEqual({ kind: 'paint', spec: source.style?.stroke });
  });

  it('在 Core 解析阶段补齐局部原点且不修改 Source', () => {
    const source: IRNode = { type: 'node' };

    expect(resolve(source).node.position).toEqual([0, 0]);
    expect(source).not.toHaveProperty('position');
  });

  it('扩展数字和类似 CSS 的框间距，同时保留显式零', () => {
    expect(
      resolve(
        node({
          layout: { padding: 3, margin: { y: 5, bottom: 0 } },
        }),
      ).node,
    ).toMatchObject({
      padding: { top: 3, right: 3, bottom: 3, left: 3 },
      margin: { top: 5, right: 0, bottom: 0, left: 0 },
    });

    expect(
      resolve(
        node({
          layout: { padding: { default: 2, x: 4, left: 1 } },
        }),
      ).node.padding,
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
      ).node,
    ).toMatchObject({
      minimumSize: { width: 12, height: 12 },
      scale: { x: 2, y: 2 },
    });

    expect(
      resolve(
        node({
          scale: { default: 3, y: 1 },
          layout: { minimumSize: { default: 10, width: 0 } },
        }),
      ).node,
    ).toMatchObject({
      minimumSize: { width: 0, height: 10 },
      scale: { x: 3, y: 1 },
    });
  });

  it('拒绝低于有效最小可见宽度的 layout.width', () => {
    expect(() => resolve(node({ layout: { width: 40, minimumSize: { width: 50 } } }))).toThrowError(
      expect.objectContaining({ code: RetikzCoreErrorCode.Resolve }) as RetikzCoreError,
    );

    expect(resolve(node({ layout: { width: 50, minimumSize: { width: 50 } } })).node.width).toBe(50);
  });

  it('提供 Node 默认值，而不更改不相关的 IR 字段', () => {
    const source = node({ id: 'node-a', text: 'A' });

    expect(resolve(source).node).toEqual({
      ...source,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      minimumSize: { width: 0, height: 0 },
      scale: { x: 1, y: 1 },
      text: ['A'],
      label: undefined,
      align: 'middle',
      rotate: 0,
      dashPattern: undefined,
      shadow: undefined,
    });
  });

  it('规范化文本简写，而不删除空字符串或重新排序行', () => {
    expect(resolve(node({ text: '' })).node.text).toEqual(['']);

    const lines: NonNullable<IRNode['text']> = ['first', { text: 'second' }];

    expect(resolve(node({ text: lines })).node.text).toEqual(lines);
  });

  it('将有效标签默认值具体化到每个规范标签中', () => {
    const frame = resolveScopeDefaults({
      type: 'scope',
      children: [],

      defaults: {
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
      },
    });
    const resolved = resolve(node({ label: { text: 'x', font: { size: 10 } } }), frame).node;

    expect(resolved.label).toEqual([
      {
        text: 'x',
        align: 'middle',
        position: 'top',
        placement: 'outside',
        distance: 12,
        textColor: 'blue',
        opacity: 0.5,
        font: { family: 'default', size: 10, weight: 'bold' },
      },
    ]);
  });

  it('填充规范标签默认值，而不替换明确的零或 false', () => {
    expect(resolve(node({ label: { text: 'default' } })).node.label).toEqual([
      { text: 'default', align: 'middle', position: 'top', placement: 'outside', distance: 12 },
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
      ).node.label,
    ).toEqual([
      {
        text: 'explicit',
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
    expect(resolve(node({ label: { text: 'default' } })).node.label).toEqual([
      { text: 'default', position: 'top', placement: 'outside', distance: 12, align: 'middle' },
    ]);

    expect(resolve(node({ label: { text: 'explicit', align: 'start' } })).node.label).toEqual([
      { text: 'explicit', position: 'top', placement: 'outside', distance: 12, align: 'start' },
    ]);
  });

  it('当其位置省略 1 时，填充边界标签分数', () => {
    expect(resolve(node({ label: { text: 'boundary', position: { boundary: 'right' } } })).node.label).toEqual([
      {
        text: 'boundary',
        align: 'middle',
        position: { boundary: 'right', fraction: 0.5 },
        placement: 'outside',
        distance: 12,
      },
    ]);
  });

  it('解析 Node 标量默认值以及静态虚线和阴影形式', () => {
    const defaults = resolve(node()).node;

    expect(defaults.align).toBe('middle');
    expect(defaults.rotate).toBe(0);
    expect(
      resolve(
        node({
          style: { dashed: true, dotted: true },
        }),
      ).node.dashPattern,
    ).toEqual([4, 2]);
    expect(
      resolve(
        node({
          style: { dashPattern: [0, 2], dashed: true, dotted: true },
        }),
      ).node.dashPattern,
    ).toEqual([0, 2]);
    expect(
      resolve(
        node({
          style: { dashed: true, dotted: true },
        }),
      ).node,
    ).not.toHaveProperty('dashed');
    expect(
      resolve(
        node({
          style: { dashed: true, dotted: true },
        }),
      ).node,
    ).not.toHaveProperty('dotted');
    expect(
      resolve(
        node({
          style: { shadow: { offsetX: 0, offsetY: 0, opacity: 0 } },
        }),
      ).node.shadow,
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

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
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
      layout: { align: 'middle' },
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });
});
