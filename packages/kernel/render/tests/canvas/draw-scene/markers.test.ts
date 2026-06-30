import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { drawScene } from '../../../src/canvas';
import { createSpyCanvasContext, stealthSpec } from './helpers';

describe('drawScene 箭头 marker', () => {
  it('arrow-end-renders：末端 marker 贴终点、沿切线定向、按 markerUnits=strokeWidth 缩放、contextStroke 解析为线色', () => {
    const context = createSpyCanvasContext();
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 2,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    // 定位到终点 [40,0]，并将 marker 参考点 (refX=3, refY=baseSize/2=5) 平移回原点
    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === 40 && c.args[1] === 0)).toBe(true);
    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === -3 && c.args[1] === -5)).toBe(true);
    // 切线方向为 +x → 旋转角 0
    expect(context.calls.some(c => c.name === 'rotate' && c.args[0] === 0)).toBe(true);
    // 缩放 = markerWidth/baseSize × strokeWidth = 6/10 × 2 = 1.2（两轴各自）
    const scaleCall = context.calls.find(c => c.name === 'scale');
    expect(scaleCall?.args).toEqual([1.2, 1.2]);
    // 实心三角被填充，contextStroke 解析为 path 的 stroke 色
    const markerFill = [...context.calls].reverse().find(c => c.name === 'fill');
    expect(markerFill?.fillStyle).toBe('#222');
    // marker 几何按局部 baseSize 坐标绘制
    const moveTos = context.calls.filter(c => c.name === 'moveTo').map(c => c.args);
    expect(moveTos).toContainEqual([0, 0]);
    expect(context.calls.some(c => c.name === 'lineTo' && c.args[0] === 10 && c.args[1] === 5)).toBe(true);
  });

  it('arrow-start-reverse：起点 marker 朝向反向（auto-start-reverse）', () => {
    const context = createSpyCanvasContext();
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 1,
          arrowStart: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    // 起点 [0,0]；离开方向 +x，反向后角度为 π
    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === 0 && c.args[1] === 0)).toBe(true);
    const rotateCall = context.calls.find(c => c.name === 'rotate');
    expect(rotateCall?.args[0]).toBeCloseTo(Math.PI);
    // strokeWidth=1 → 缩放 0.6
    expect(context.calls.find(c => c.name === 'scale')?.args).toEqual([0.6, 0.6]);
  });

  it('arrow-orient-diagonal：切线为对角线时旋转角等于 atan2', () => {
    const context = createSpyCanvasContext();
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 80 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [30, 30] },
          ],
          stroke: '#000',
          strokeWidth: 1,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    expect(context.calls.find(c => c.name === 'rotate')?.args[0]).toBeCloseTo(Math.atan2(30, 30));
  });

  it('arrow-marker-isolated-strokestyle：空心 marker 描边不继承 path 的 lineCap / lineJoin（如 SVG defs marker）', () => {
    const context = createSpyCanvasContext();
    const hollowSpec = {
      shape: 'open' as const,
      baseSize: 10,
      refX: 1,
      markerWidth: 6,
      markerHeight: 6,
      marker: [
        {
          type: 'path' as const,
          commands: [
            { kind: 'move' as const, to: [1, 1] as [number, number] },
            { kind: 'line' as const, to: [9, 5] as [number, number] },
            { kind: 'line' as const, to: [1, 9] as [number, number] },
            { kind: 'close' as const },
          ],
          stroke: 'context-stroke',
          strokeWidth: 1,
        },
      ],
    };
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          arrowEnd: hollowSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    // path 自身用 round；marker 描边应回到 canvas 默认 butt / miter（与 SVG defs marker 一致）
    const strokeCalls = context.calls.filter(c => c.name === 'stroke');
    const markerStroke = strokeCalls[strokeCalls.length - 1];
    expect(markerStroke.lineCap).toBe('butt');
    expect(markerStroke.lineJoin).toBe('miter');
  });

  it('arrow-open-stealth-renders-hollow：openStealth 空心倒钩按凹口几何描边、不填充', () => {
    const context = createSpyCanvasContext();
    const openStealthSpec = {
      shape: 'openStealth' as const,
      baseSize: 10,
      refX: 2.25,
      markerWidth: 6,
      markerHeight: 6,
      marker: [
        {
          type: 'path' as const,
          commands: [
            { kind: 'move' as const, to: [1, 1] as [number, number] },
            { kind: 'line' as const, to: [9, 5] as [number, number] },
            { kind: 'line' as const, to: [1, 9] as [number, number] },
            { kind: 'line' as const, to: [3, 5] as [number, number] },
            { kind: 'close' as const },
          ],
          stroke: 'context-stroke',
          strokeWidth: 1.5,
          strokeLinejoin: 'miter' as const,
        },
      ],
    };
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#2255aa',
          strokeWidth: 1,
          arrowEnd: openStealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene);

    expect(context.calls.some(c => c.name === 'translate' && c.args[0] === -2.25 && c.args[1] === -5)).toBe(true);
    expect(context.calls.some(c => c.name === 'lineTo' && c.args[0] === 3 && c.args[1] === 5)).toBe(true);
    const strokeCalls = context.calls.filter(c => c.name === 'stroke');
    const markerStroke = strokeCalls[strokeCalls.length - 1];
    expect(markerStroke.strokeStyle).toBe('#2255aa');
    expect(markerStroke.lineJoin).toBe('miter');
    expect(context.calls.filter(c => c.name === 'fill')).toHaveLength(0);
  });

  it('arrow-no-marker-warning：渲染箭头不再发 marker 降级告警', () => {
    const context = createSpyCanvasContext();
    const warnings: Array<string> = [];
    const arrowScene: Scene = {
      layout: { x: 0, y: 0, width: 80, height: 40 },
      primitives: [
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [40, 0] },
          ],
          stroke: '#222',
          strokeWidth: 1,
          arrowEnd: stealthSpec,
        },
      ],
    };

    drawScene(context as unknown as CanvasRenderingContext2D, arrowScene, {
      warnUnsupported: w => warnings.push(w.feature),
    });

    expect(warnings).not.toContain('marker');
  });
});
