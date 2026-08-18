import type { BoundaryDefinition, ClipDefinition, IRScene } from '@retikz/core';

import { compileToScene, defineBoundary, defineClip } from '@retikz/core';
import { RetikzRetainedRenderErrorCode } from '@retikz/render/runtime';
import { renderToSvgString as svgRenderToString } from '@retikz/render/svg';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { RenderToStringOptions } from '../../src';
import type { MountOptions } from '../../src/dom';

import { renderToSvgString } from '../../src';

/**
 * @retikz/vanilla renderToSvgString（SSR / 构建期，node 环境，无 DOM）
 */
const nodeIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
};

const boundaryIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], minimumSize: 40, boundary: 'pin' },
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [100, 0] },
        { type: 'step', kind: 'line', to: { id: 'a' } },
      ],
    },
  ],
};

const fixedBoundary = (): BoundaryDefinition =>
  defineBoundary({
    name: 'pin',
    paramsSchema: z.strictObject({}),
    boundaryPoint: rect => [rect.x + 7, rect.y],
  });

const circleFrameClip = (): ClipDefinition =>
  defineClip({
    kind: 'circleFrame',
    schema: z.strictObject({
      kind: z.literal('circleFrame'),
      cx: z.number(),
      cy: z.number(),
      outer: z.number().positive(),
      inner: z.number().positive(),
    }),
    resolve: spec => ({
      kind: 'circleFrame',
      cx: spec.cx,
      cy: spec.cy,
      outer: spec.outer,
      inner: spec.inner,
    }),
    shapeSchema: z.strictObject({
      kind: z.literal('circleFrame'),
      cx: z.number(),
      cy: z.number(),
      outer: z.number().positive(),
      inner: z.number().positive(),
    }),
    lower: shape => ({
      commands: [
        { kind: 'move', to: [shape.cx + shape.outer, shape.cy] },
        { kind: 'arc', center: [shape.cx, shape.cy], radius: shape.outer, startAngle: 0, endAngle: 360 },
        { kind: 'close' },
        { kind: 'move', to: [shape.cx + shape.inner, shape.cy] },
        { kind: 'arc', center: [shape.cx, shape.cy], radius: shape.inner, startAngle: 0, endAngle: 360 },
        { kind: 'close' },
      ],
      fillRule: 'evenodd',
    }),
  });

const clipIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip: { kind: 'circleFrame', cx: 0, cy: 0, outer: 40, inner: 20 },
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    },
  ],
};

describe('@retikz/vanilla renderToSvgString', () => {
  it('render-string-matches-svg：与 @retikz/render/svg 输出逐字一致（薄包、未另写序列化）', () => {
    const scene = compileToScene(nodeIr).scene;
    // vanilla 缺省 idPrefix='r'，与显式 'r' 的 svg 输出应逐字相同
    expect(renderToSvgString(scene)).toBe(svgRenderToString(scene, { idPrefix: 'r' }));
  });

  it('ir-default-fallback-measurer：ir 入参在 Node 下确定（默认 fallback / 可注入 measureText）', () => {
    const a = renderToSvgString(nodeIr);
    const b = renderToSvgString(nodeIr);
    expect(a).toBe(b); // 同输入逐字一致 → 确定性（fallbackMeasurer）
    // 注入更宽的度量器 → 节点尺寸变 → 输出不同（证明 measureText 真生效、ir contract 完整）
    const wide = renderToSvgString(nodeIr, { compile: { measureText: () => ({ width: 999, height: 40 }) } });
    expect(wide).not.toBe(a);
  });

  it('empty-scene-string：空 scene 产合法 <svg>、不抛', () => {
    const empty = { layout: { x: 0, y: 0, width: 10, height: 10 }, primitives: [] };
    expect(renderToSvgString(empty as never)).toMatch(/^<svg/);
  });

  it('inject-size：给 width/height 时结构化写进根 <svg>（不做正则后处理），缺省不写', () => {
    const scene = compileToScene(nodeIr).scene;
    // render 侧直接接受 width/height（vanilla 不做正则注入）
    const sized = svgRenderToString(scene, { idPrefix: 'r', width: 200, height: 100 });
    expect(sized).toMatch(/^<svg width="200" height="100" viewBox=/);
    // vanilla 透传到 render，输出与 render 逐字一致
    expect(renderToSvgString(scene, { output: { width: 200, height: 100 } })).toBe(sized);
    // 缺省时根 <svg> 不带 size（直接以 viewBox 开头；内层 rect 自带 width 不算）
    expect(renderToSvgString(scene)).toMatch(/^<svg viewBox=/);
  });

  it('rejects mount-only runtime and unknown top-level SSR options instead of silently ignoring them', () => {
    const mountOptions: MountOptions = {
      runtime: {
        rendererFactory: () => {
          throw new Error('unused renderer factory');
        },
      },
    };
    expect(() => renderToSvgString(nodeIr, mountOptions as unknown as RenderToStringOptions)).toThrowError(
      expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
    expect(() => renderToSvgString(nodeIr, { ignored: true } as unknown as RenderToStringOptions)).toThrowError(
      expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
  });
  it('passes boundary providers to compile options', () => {
    expect(() => renderToSvgString(boundaryIr)).toThrow(/options\.boundaries/i);
    expect(renderToSvgString(boundaryIr, { compile: { boundaries: [fixedBoundary()] } })).toMatch(/^<svg/);
  });

  it('passes clip providers to compile options', () => {
    expect(() => renderToSvgString(clipIr)).toThrow(/options\.clips/i);
    const svg = renderToSvgString(clipIr, {
      compile: { clips: [circleFrameClip()] },
    });
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('clip-rule="evenodd"');
  });
});
