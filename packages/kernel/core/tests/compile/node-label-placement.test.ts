import { describe, expect, it } from 'vitest';

import type { ScenePrimitive, TextPrim } from '../../src/primitive';
import type { IR, IRNode, IRNodeLabel } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { ASCENT_FACTOR, DESCENT_FACTOR } from '../../src/compile/text-baseline';
import { NodeLabelSchema, SceneSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const silent = { onWarn: () => {} };

const visualMiddle = (t: TextPrim): number => t.y - (t.fontSize * ASCENT_FACTOR - t.fontSize * DESCENT_FACTOR) / 2;

const labelText = (prims: Array<ScenePrimitive>, text: string): TextPrim | undefined =>
  flattenPrims(prims).find(
    (p): p is TextPrim => p.type === 'text' && p.lines.some(l => (typeof l === 'string' ? l : l.text) === text),
  );

const sceneWithLabel = (label: IRNodeLabel, shape: IRNode['shape'] = 'rectangle'): IR => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'A',
      position: [0, 0],
      shape,
      minimumWidth: 100,
      minimumHeight: 60,
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

    it('compass boundary 别名归一到 Web canonical', () => {
      expect(NodeLabelSchema.parse({ text: 'L', position: { boundary: 'north' } })).toMatchObject({
        position: { boundary: 'top' },
      });
      expect(NodeLabelSchema.parse({ text: 'L', position: { boundary: 'below' } })).toMatchObject({
        position: { boundary: 'bottom' },
      });
    });

    it('方向 position 支持 Web canonical、compass alias 与旧 above/below alias，并归一到 Web', () => {
      expect(NodeLabelSchema.parse({ text: 'L', position: 'top-left' })).toMatchObject({ position: 'top-left' });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'south-east' })).toMatchObject({
        position: 'bottom-right',
      });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'north-east' })).toMatchObject({
        position: 'top-right',
      });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'above' })).toMatchObject({ position: 'top' });
      expect(NodeLabelSchema.parse({ text: 'L', position: 'above-left' })).toMatchObject({ position: 'top-left' });
    });

    it('拒绝未知 placement、未知 boundary 与越界 fraction', () => {
      expect(() => NodeLabelSchema.parse({ text: 'L', placement: 'inner' })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'up' } })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'top', fraction: 1.1 } })).toThrow();
      expect(() => NodeLabelSchema.parse({ text: 'L', position: { boundary: 'top', t: 0.5 } })).toThrow();
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
      );
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(0);
      expect(visualMiddle(label)).toBeCloseTo(-24);
    });

    it('数字角度 + inside 沿径向向内偏移', () => {
      const scene = compileToScene(
        sceneWithLabel({ text: 'L', position: 0, placement: 'inside', distance: 8 }),
        silent,
      );
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(42);
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
      );
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(-25);
      expect(visualMiddle(label)).toBeCloseTo(-24);
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
      );
      const label = labelText(scene.primitives, 'L')!;

      expect(label.x).toBeCloseTo(42);
      expect(visualMiddle(label)).toBeCloseTo(0);
    });

    it('boundary position 的端点 fraction=0 / fraction=1 落在同一条边界两端', () => {
      const start = compileToScene(
        sceneWithLabel({ text: 'S', position: { boundary: 'bottom', fraction: 0 }, distance: 0 }),
        silent,
      );
      const end = compileToScene(
        sceneWithLabel({ text: 'E', position: { boundary: 'bottom', fraction: 1 }, distance: 0 }),
        silent,
      );
      const startLabel = labelText(start.primitives, 'S')!;
      const endLabel = labelText(end.primitives, 'E')!;

      expect(startLabel.x).toBeCloseTo(-50);
      expect(endLabel.x).toBeCloseTo(50);
      expect(visualMiddle(startLabel)).toBeCloseTo(30);
      expect(visualMiddle(endLabel)).toBeCloseTo(30);
    });

    it('非 box-like shape 使用 boundary position 时抛出诊断', () => {
      expect(() =>
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
        ),
      ).toThrow(/boundary.*box-like|box-like.*boundary/i);
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
      const base = compileToScene(sceneWithLabel(label), silent);
      const rotated = compileToScene(
        {
          ...sceneWithLabel(label),
          children: [{ ...sceneWithLabel(label).children[0], rotate: 90 }],
        },
        silent,
      );
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
      );

      expect(flattenPrims(scene.primitives).some(p => p.type === 'path')).toBe(true);
    });
  });
});
