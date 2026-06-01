import { describe, expect, it } from 'vitest';
import { compileToScene } from '@retikz/core';
import type { IR } from '@retikz/core';
import { renderToSvgString as svgRenderToString } from '@retikz/render/svg';
import { renderToSvgString } from '../src';

/**
 * @retikz/vanilla renderToSvgString（SSR / 构建期，node 环境，无 DOM）
 */
const nodeIr: IR = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
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
});
