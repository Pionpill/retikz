import { curve } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../../src';
import type { IRScene, IRStep, PathPrimitive, ResolvedArrowEnd } from '../../../src';
import { createStrokePathGeometry, curveSegmentOfOccurrence } from '../../../src/compile/path/stroke/interruption';
import { applyTransformChain } from '../../../src/compile/transform';
import { flattenPrims } from '../../helpers/flatten';

describe('endpoint arrow contact', () => {
  it.each(['line', 'curve', 'cubic'] as const)('%s 的默认箭头尖端落在目标坐标', kind => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          style: { strokeWidth: 2 },
          arrow: { end: { shape: 'stealth' } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            ...(kind === 'line'
              ? [{ type: 'step' as const, kind: 'line' as const, to: [180, 0] as [number, number] }]
              : kind === 'curve'
                ? [
                    {
                      type: 'step' as const,
                      kind: 'curve' as const,
                      control: [90, -100] as [number, number],
                      to: [180, 0] as [number, number],
                    },
                  ]
                : [
                    {
                      type: 'step' as const,
                      kind: 'cubic' as const,
                      control1: [60, -80] as [number, number],
                      control2: [120, -80] as [number, number],
                      to: [180, 0] as [number, number],
                    },
                  ]),
          ],
        },
      ],
    };
    const path = flattenPrims(compileToScene(ir, { padding: 0 }).scene.primitives).find(
      (primitive): primitive is PathPrimitive => primitive.type === 'path' && primitive.arrowEnd !== undefined,
    );
    if (path === undefined || path.arrowEnd === undefined) throw new Error('Expected endpoint arrow');
    const command = path.commands.at(-1);
    if (command === undefined || (command.kind !== 'line' && command.kind !== 'quad' && command.kind !== 'cubic')) {
      throw new Error('Expected Cartesian terminal segment');
    }
    const control = command.kind === 'quad' ? command.control : command.kind === 'cubic' ? command.control2 : [0, 0];
    const direction = [command.to[0] - control[0], command.to[1] - control[1]];
    const length = Math.hypot(...direction);
    const marker = path.arrowEnd;
    // 内置 stealth 尖端位于局部 x=baseSize，SVG 与 Canvas 均沿末端切线放置
    const localTip =
      marker.marker[0]?.type === 'group'
        ? applyTransformChain([marker.baseSize, marker.baseSize / 2], marker.marker[0].transforms ?? [])
        : [marker.baseSize, marker.baseSize / 2];
    const localX = ((localTip[0] - marker.refX) * marker.markerWidth * 2) / marker.baseSize;
    const localY = ((localTip[1] - marker.baseSize / 2) * marker.markerHeight * 2) / marker.baseSize;
    const tip = [
      command.to[0] + (direction[0] / length) * localX - (direction[1] / length) * localY,
      command.to[1] + (direction[1] / length) * localX + (direction[0] / length) * localY,
    ];
    expect(tip[0]).toBeCloseTo(180, 2);
    expect(tip[1]).toBeCloseTo(0, 2);
  });
});

/** 按 SVG / Canvas 的 marker 变换契约计算局部点的实际场景位置 */
const markerPoint = (
  spec: ResolvedArrowEnd,
  local: [number, number],
  position: [number, number],
  tangent: [number, number],
  start: boolean,
): [number, number] => {
  const group = spec.marker[0];
  const transformed = group.type === 'group' ? applyTransformChain(local, group.transforms ?? []) : local;
  const x = ((transformed[0] - spec.refX) * spec.markerWidth * 2) / spec.baseSize;
  const y = ((transformed[1] - spec.baseSize / 2) * spec.markerHeight * 2) / spec.baseSize;
  const angle = Math.atan2(tangent[1], tangent[0]) + (start ? Math.PI : 0);
  return [
    position[0] + x * Math.cos(angle) - y * Math.sin(angle),
    position[1] + x * Math.sin(angle) + y * Math.cos(angle),
  ];
};

describe('preserved endpoint geometry', () => {
  it('末段不足时沿前一段寻找接合点，箭头仍指向原目标', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          style: { strokeWidth: 2 },
          arrow: { end: {} },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
            { type: 'step', kind: 'line', to: [100, 2] },
          ],
        },
      ],
    };
    const path = flattenPrims(compileToScene(scene, { padding: 0 }).scene.primitives).find(
      (p): p is PathPrimitive => p.type === 'path',
    );
    if (!path?.arrowEnd) throw new Error('Missing arrow');
    expect(path.commands).toHaveLength(2);
    const end = path.commands.at(-1);
    if (end?.kind !== 'line') throw new Error('Expected line');
    const tip = markerPoint(path.arrowEnd, [10, 5], end.to, [1, 0], false);
    expect(tip[0]).toBeCloseTo(100, 2);
    expect(tip[1]).toBeCloseTo(2, 2);
  });

  it('零长度路径不放置无方向的默认端点箭头', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: { end: {} },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 0] },
          ],
        },
      ],
    };
    const paths = flattenPrims(compileToScene(scene).scene.primitives).filter(
      (p): p is PathPrimitive => p.type === 'path',
    );
    expect(paths.every(path => path.arrowEnd === undefined)).toBe(true);
  });

  const cases: Array<{ name: string; step: IRStep }> = [
    { name: 'quadratic', step: { type: 'step', kind: 'curve', control: [90, -100], to: [180, 0] } },
    { name: 'cubic', step: { type: 'step', kind: 'cubic', control1: [60, -80], control2: [120, -80], to: [180, 0] } },
    { name: 'arc', step: { type: 'step', kind: 'arc', center: [90, 0], radius: 90, startAngle: -180, endAngle: 0 } },
    {
      name: 'ellipse',
      step: { type: 'step', kind: 'arc', center: [90, 0], radius: { x: 90, y: 50 }, startAngle: -180, endAngle: 0 },
    },
  ];
  it.each(cases.flatMap(entry => [false, true].map(interrupt => ({ ...entry, interrupt }))))(
    '$name 双端尖端固定，非等比箭头接合点随曲线切片：断口=$interrupt',
    ({ step, interrupt }) => {
      const scene: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            style: { strokeWidth: 2 },
            ...(interrupt ? { label: [{ text: 'gap', position: 0.5, sloped: true, interrupt: true }] } : {}),
            arrow: { start: { length: 12, width: 4 }, end: { length: 12, width: 4 } },
            children: [{ type: 'step', kind: 'move', to: [0, 0] }, step],
          },
        ],
      };
      const paths = flattenPrims(compileToScene(scene, { padding: 0 }).scene.primitives).filter(
        (p): p is PathPrimitive => p.type === 'path',
      );
      for (const start of [true, false]) {
        const path = paths.find(p => (start ? p.arrowStart : p.arrowEnd));
        const spec = start ? path?.arrowStart : path?.arrowEnd;
        if (!path || !spec) throw new Error('Missing endpoint arrow');
        const geometry = createStrokePathGeometry(path.commands, []);
        const occurrence = start ? geometry.occurrences[0] : geometry.occurrences.at(-1);
        if (!occurrence) throw new Error('Missing endpoint geometry');
        const sample = curve.sampleAt(curveSegmentOfOccurrence(occurrence), start ? 0 : 1);
        const tip = markerPoint(spec, [spec.baseSize, spec.baseSize / 2], sample.point, sample.tangent, start);
        expect(tip[0]).toBeCloseTo(start ? 0 : 180, 1);
        expect(tip[1]).toBeCloseTo(0, 1);
        const contact = markerPoint(spec, [spec.refX, spec.baseSize / 2], sample.point, sample.tangent, start);
        expect(contact[0]).toBeCloseTo(sample.point[0], 8);
        expect(contact[1]).toBeCloseTo(sample.point[1], 8);
      }
      if (step.kind === 'curve' || step.kind === 'cubic') {
        const path = paths[0];
        const segment = curveSegmentOfOccurrence(createStrokePathGeometry(path.commands, []).occurrences[0]);
        for (const parameter of [0, 0.25, 0.5, 0.75, 1]) {
          const position = curve.sampleAt(segment, parameter).point;
          const originalParameter = position[0] / 180;
          expect(position[1]).toBeCloseTo(
            -(step.kind === 'curve' ? 200 : 240) * originalParameter * (1 - originalParameter),
            1,
          );
        }
      }
    },
  );

  it.each([false, true])('短路径缩小箭头并保持目标，不翻转：双端=$both', both => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          style: { strokeWidth: 2 },
          arrow: { end: {} },
          marks: [...(both ? [{ pos: 0 }] : [])],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [2, 0] },
          ],
        },
      ],
    };
    const path = flattenPrims(compileToScene(scene, { padding: 0 }).scene.primitives).find(
      (p): p is PathPrimitive => p.type === 'path',
    );
    if (!path?.arrowEnd) throw new Error('Missing short-path arrow');
    const end = path.commands.at(-1);
    if (end?.kind !== 'line') throw new Error('Expected terminal line');
    expect(markerPoint(path.arrowEnd, [10, 5], end.to, [1, 0], false)[0]).toBeCloseTo(2, 2);
    expect(path.arrowEnd.markerWidth).toBeLessThan(8);
  });
});
