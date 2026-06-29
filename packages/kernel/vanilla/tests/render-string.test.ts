import type { IR } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { renderToSvgString as svgRenderToString } from '@retikz/render/svg';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { BoundaryDefinition, ClipDefinition } from '../src';

import { defineBoundary, defineClip, renderToSvgString } from '../src';

/**
 * @retikz/vanilla renderToSvgString（SSR / 构建期，node 环境，无 DOM）
 */
const nodeIr: IR = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
};

const boundaryIr: IR = {
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
      kind: 'compound',
      fillRule: 'evenodd',
      children: [
        { kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.outer },
        { kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.inner },
      ],
    }),
  });

const clipIr: IR = {
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
    const scene = compileToScene(nodeIr);
    // vanilla 缺省 idPrefix='r'，与显式 'r' 的 svg 输出应逐字相同
    expect(renderToSvgString(scene)).toBe(svgRenderToString(scene, { idPrefix: 'r' }));
  });

  it('ir-default-fallback-measurer：ir 入参在 Node 下确定（默认 fallback / 可注入 measureText）', () => {
    const a = renderToSvgString(nodeIr);
    const b = renderToSvgString(nodeIr);
    expect(a).toBe(b); // 同输入逐字一致 → 确定性（fallbackMeasurer）
    // 注入更宽的度量器 → 节点尺寸变 → 输出不同（证明 measureText 真生效、ir contract 完整）
    const wide = renderToSvgString(nodeIr, { measureText: () => ({ width: 999, height: 40 }) });
    expect(wide).not.toBe(a);
  });

  it('empty-scene-string：空 scene 产合法 <svg>、不抛', () => {
    const empty = { layout: { x: 0, y: 0, width: 10, height: 10 }, primitives: [] };
    expect(renderToSvgString(empty as never)).toMatch(/^<svg/);
  });

  it('inject-size：给 width/height 时结构化写进根 <svg>（不做正则后处理），缺省不写', () => {
    const scene = compileToScene(nodeIr);
    // render 侧直接接受 width/height（vanilla 不做正则注入）
    const sized = svgRenderToString(scene, { idPrefix: 'r', width: 200, height: 100 });
    expect(sized).toMatch(/^<svg width="200" height="100" viewBox=/);
    // vanilla 透传到 render，输出与 render 逐字一致
    expect(renderToSvgString(scene, { width: 200, height: 100 })).toBe(sized);
    // 缺省时根 <svg> 不带 size（直接以 viewBox 开头；内层 rect 自带 width 不算）
    expect(renderToSvgString(scene)).toMatch(/^<svg viewBox=/);
  });
  it('passes boundary providers to compile options', () => {
    expect(() => renderToSvgString(boundaryIr)).toThrow(/options\.boundaries/i);
    expect(renderToSvgString(boundaryIr, { boundaries: [fixedBoundary()] })).toMatch(/^<svg/);
  });

  it('passes clip providers to compile options', () => {
    expect(() => renderToSvgString(clipIr)).toThrow(/options\.clips/i);
    const svg = renderToSvgString(clipIr, { clips: [circleFrameClip()] });
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('clip-rule="evenodd"');
  });
});
