import { describe, expect, it } from 'vitest';

import type { ScenePrimitive, TextPrim } from '../../src/contract';
import type { IRNode, IRNodeLabel, IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { NodeLabelSchema, SceneSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const silent = { onWarn: () => {} };

const visualMiddle = (t: TextPrim): number => t.y;

const labelText = (prims: Array<ScenePrimitive>, text: string): TextPrim | undefined =>
  flattenPrims(prims).find(
    (p): p is TextPrim => p.type === 'text' && p.lines.some(l => (typeof l === 'string' ? l : l.text) === text),
  );

const sceneWithLabel = (label: IRNodeLabel, shape: IRNode['shape'] = 'rectangle'): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'A',
      position: [0, 0],
      shape,
      minimumSize: { width: 100, height: 60 },
      label,
    },
  ],
});

describe('Node label placement', () => {
  describe('schema', () => {
    it('接受 inside placement 与边界比例 position', () => {
      expect(
        NodeLabelSchema.parse({
          text: 'L',
          position: { boundary: 'top', fraction: 0.25 },
          placement: 'inside',
          distance: 6,
        }),
      ).toMatchObject({
        text: 'L',
        position: { boundary: 'top', fraction: 0.25 },
        placement: 'inside',
      });
    });

    it('boundary position 只接受 canonical side', () => {
      expect(NodeLabelSchema.parse({ text: 'L', position: { boundary: 'top' } })).toMatchObject({
        position: { boundary: 'top' },
      });
      expect(NodeLabelSchema.parse({ text: 'L', position: { boundary: 'bottom' } })).toMatchObject({
        position: { boundary: 'bottom' },
      });
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'north' } })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'above' } })).toThrow();
    });

    it('方向 position 只接受 canonical 方位', () => {
      expect(NodeLabelSchema.parse({ text: 'L', position: 'top-left' })).toMatchObject({ position: 'top-left' });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'bottom-right' })).toMatchObject({
        position: 'bottom-right',
      });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'top-right' })).toMatchObject({
        position: 'top-right',
      });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'top' })).toMatchObject({ position: 'top' });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'top-left' })).toMatchObject({ position: 'top-left' });
      expect(() => NodeLabelSchema.parse({ text: 'L', position: 'north-west' })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: 'below' })).toThrow();
    });

    it('拒绝未知 placement、未知 boundary 与越界 fraction', () => {
      expect(() => NodeLabelSchema.parse({ text: 'L', placement: 'inner' })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'up' } })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'top', fraction: 1.1 } })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'top', offset: 0.5 } })).toThrow();
    });

    it('接受 Core 文本对齐值并拒绝未知值', () => {
      expect(NodeLabelSchema.parse({ text: 'L', align: 'start' })).toMatchObject({ align: 'start' });
      expect(NodeLabelSchema.parse({ text: 'L', align: 'middle' })).toMatchObject({ align: 'middle' });
      expect(NodeLabelSchema.parse({ text: 'L', align: 'end' })).toMatchObject({ align: 'end' });
      expect(() => NodeLabelSchema.parse({ text: 'L', align: 'left' })).toThrow();
    });

    it('拒绝 inside placement 与 pin 同时出现', () => {
      expect(() =>
        NodeLabelSchema.parse({
          text: 'L',
          position: 'top',
          placement: 'inside',
          pin: true,
        }),
      ).toThrow();
    });

    it('IR JSON round-trip 保留 boundary label position', () => {
      const ir = sceneWithLabel({
        text: 'L',
        position: { boundary: 'right', fraction: 0.2 },
        placement: 'outside',
        distance: 4,
      });
      expect(SceneSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
    });
  });

  describe('inside placement', () => {
    it('top + inside 沿 top boundary 向内偏移', () => {
      const scene = compileToScene(
        sceneWithLabel({ text: 'L', position: 'top', placement: 'inside', distance: 6 }),
        silent,
      ).scene;
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(0);
      expect(visualMiddle(label)).toBeCloseTo(-14.4);
    });

    it('数字角度 + inside 沿径向向内偏移', () => {
      const scene = compileToScene(
        sceneWithLabel({ text: 'L', position: 0, placement: 'inside', distance: 8 }),
        silent,
      ).scene;
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(37.6);
      expect(visualMiddle(label)).toBeCloseTo(0);
    });
  });

  describe('boundary position', () => {
    it('top boundary 支持自定义比例位置并向内偏移', () => {
      const scene = compileToScene(
        sceneWithLabel({
          text: 'L',
          position: { boundary: 'top', fraction: 0.25 },
          placement: 'inside',
          distance: 6,
        }),
        silent,
      ).scene;
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(-25);
      expect(visualMiddle(label)).toBeCloseTo(-14.4);
    });

    it('right boundary 缺省 fraction=0.5 并向内偏移', () => {
      const scene = compileToScene(
        sceneWithLabel({
          text: 'L',
          position: { boundary: 'right' },
          placement: 'inside',
          distance: 8,
        }),
        silent,
      ).scene;
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(37.6);
      expect(visualMiddle(label)).toBeCloseTo(0);
    });

    it('boundary position 的端点 fraction=0 / fraction=1 落在同一条边界两端', () => {
      const start = compileToScene(
        sceneWithLabel({ text: 'S', position: { boundary: 'bottom', fraction: 0 }, distance: 0 }),
        silent,
      ).scene;
      const end = compileToScene(
        sceneWithLabel({ text: 'E', position: { boundary: 'bottom', fraction: 1 }, distance: 0 }),
        silent,
      ).scene;
      const startLabel = labelText(start.primitives, 'S')!;
      const endLabel = labelText(end.primitives, 'E')!;

      expect(startLabel.x).toBeCloseTo(-50);
      expect(endLabel.x).toBeCloseTo(50);
      expect(visualMiddle(startLabel)).toBeCloseTo(39.6);
      expect(visualMiddle(endLabel)).toBeCloseTo(39.6);
    });

    it('非 box-like shape 使用 boundary position 时抛出诊断', () => {
      expect(
        () =>
          compileToScene(
            sceneWithLabel(
              {
                text: 'L',
                position: { boundary: 'top', fraction: 0.5 },
                placement: 'inside',
              },
              'circle',
            ),
            silent,
          ).scene,
      ).toThrow(/boundary.*box-like|box-like.*boundary/i);
    });

    it('bottom boundary 的 start / end 沿切线贴合视觉盒边缘', () => {
      const start = compileToScene(
        sceneWithLabel({ text: 'Start', position: { boundary: 'bottom', fraction: 0 }, align: 'start', distance: 0 }),
        silent,
      ).scene;
      const end = compileToScene(
        sceneWithLabel({ text: 'End', position: { boundary: 'bottom', fraction: 0 }, align: 'end', distance: 0 }),
        silent,
      ).scene;
      const startLabel = labelText(start.primitives, 'Start')!;
      const endLabel = labelText(end.primitives, 'End')!;
      const borderX = -50;

      expect(startLabel.x - startLabel.measuredWidth / 2).toBeCloseTo(borderX);
      expect(endLabel.x + endLabel.measuredWidth / 2).toBeCloseTo(borderX);
      expect(startLabel.y).toBeCloseTo(endLabel.y);
    });

    it('right boundary 的切线方向从上到下', () => {
      const start = compileToScene(
        sceneWithLabel({ text: 'Start', position: { boundary: 'right', fraction: 0 }, align: 'start', distance: 0 }),
        silent,
      ).scene;
      const end = compileToScene(
        sceneWithLabel({ text: 'End', position: { boundary: 'right', fraction: 0 }, align: 'end', distance: 0 }),
        silent,
      ).scene;
      const startLabel = labelText(start.primitives, 'Start')!;
      const endLabel = labelText(end.primitives, 'End')!;
      const borderY = -30;

      expect(startLabel.y - startLabel.measuredHeight / 2).toBeCloseTo(borderY);
      expect(endLabel.y + endLabel.measuredHeight / 2).toBeCloseTo(borderY);
      expect(startLabel.x).toBeCloseTo(50 + startLabel.measuredWidth / 2);
      expect(endLabel.x).toBeCloseTo(50 + endLabel.measuredWidth / 2);
    });

    it('center position 忽略 label align', () => {
      const middle = compileToScene(
        sceneWithLabel({ text: 'Middle', position: 'center', align: 'middle' }),
        silent,
      ).scene;
      const start = compileToScene(sceneWithLabel({ text: 'Start', position: 'center', align: 'start' }), silent).scene;
      const middleLabel = labelText(middle.primitives, 'Middle')!;
      const startLabel = labelText(start.primitives, 'Start')!;

      expect(startLabel.x).toBeCloseTo(middleLabel.x);
      expect(startLabel.y).toBeCloseTo(middleLabel.y);
    });

    it('旋转 label 的 start 使用旋转后视觉盒投影', () => {
      const scene = compileToScene(
        sceneWithLabel({
          text: 'Rotated',
          position: { boundary: 'bottom', fraction: 0 },
          align: 'start',
          rotate: 90,
          distance: 0,
        }),
        silent,
      ).scene;
      const label = labelText(scene.primitives, 'Rotated')!;

      expect(label.x - label.measuredHeight / 2).toBeCloseTo(-50);
    });
  });

  describe('interaction', () => {
    it('旋转节点的 boundary label 仍在局部坐标计算一次', () => {
      const label: IRNodeLabel = {
        text: 'L',
        position: { boundary: 'top', fraction: 0.75 },
        placement: 'inside',
        distance: 6,
      };
      const base = compileToScene(sceneWithLabel(label), silent).scene;
      const rotated = compileToScene(
        {
          ...sceneWithLabel(label),
          children: [{ ...sceneWithLabel(label).children[0], rotate: 90 }],
        },
        silent,
      ).scene;
      const baseLabel = labelText(base.primitives, 'L')!;
      const rotatedLabel = labelText(rotated.primitives, 'L')!;

      expect(rotatedLabel.x).toBeCloseTo(baseLabel.x);
      expect(rotatedLabel.y).toBeCloseTo(baseLabel.y);
    });

    it('outside + pin 仍然生成 leader line', () => {
      const scene = compileToScene(
        sceneWithLabel({
          text: 'L',
          position: { boundary: 'top', fraction: 0.5 },
          placement: 'outside',
          distance: 16,
          pin: true,
        }),
        silent,
      ).scene;

      expect(flattenPrims(scene.primitives).some(p => p.type === 'path')).toBe(true);
    });
  });
});
