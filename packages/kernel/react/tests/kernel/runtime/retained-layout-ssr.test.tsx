import type { IRScene } from '@retikz/core';

import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Layout, Path, Step } from '../../../src';

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node', position: [0, 0], shape: 'rectangle' }],
};

describe('React Layout retained SSR', () => {
  it('server render 输出 opaque seed 且不报告 useLayoutEffect warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const html = renderToString(<Layout ir={source} />);

    expect(html).toContain('<svg');
    expect(html).toContain('data-retikz-id="node"');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('static SVG SSR 与默认 retained seed 使用同一完整 Scene 输出', () => {
    const retained = renderToString(<Layout ir={source} idPrefix="ssr-policy" />);
    const staticHtml = renderToString(<Layout ir={source} idPrefix="ssr-policy" runtime={{ mode: 'static' }} />);

    expect(staticHtml.replace('></rect>', ' />')).toBe(retained);
  });

  it('带 Path Inspector 时 static SVG SSR 与默认 retained seed 仍输出同一完整 frame', () => {
    const content = (
      <Path inspect={{ controlPoints: true }}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="cubic" control1={[10, 12]} control2={[20, 12]} to={[30, 0]} />
      </Path>
    );
    const retained = renderToString(<Layout idPrefix="inspection-ssr">{content}</Layout>);
    const staticHtml = renderToString(
      <Layout idPrefix="inspection-ssr" runtime={{ mode: 'static' }}>
        {content}
      </Layout>,
    );
    const normalizeEmptyElements = (value: string): string => value.replace(/><\/(ellipse|path|rect)>/g, ' />');

    expect(retained).toContain('data-retikz-inspection="layout"');
    expect(normalizeEmptyElements(staticHtml)).toBe(normalizeEmptyElements(retained));
  });

  it('static Canvas SSR 输出与 retained 相同尺寸的 host shell', () => {
    const retained = renderToString(<Layout renderer="canvas" ir={source} width={120} height={80} />);
    const staticHtml = renderToString(
      <Layout renderer="canvas" ir={source} width={120} height={80} runtime={{ mode: 'static' }} />,
    );

    expect(retained).toContain('<canvas');
    expect(staticHtml).toContain('<canvas');
    expect(retained).toContain('width="120"');
    expect(staticHtml).toContain('width="120"');
    expect(retained).toContain('height="80"');
    expect(staticHtml).toContain('height="80"');
  });

  it('static 拒绝 retained-only 字段和非法 mode', () => {
    const createInvalid =
      (runtime: unknown): (() => string) =>
      () =>
        renderToString(<Layout ir={source} runtime={runtime as never} />);

    expect(createInvalid({ mode: 'static', updateStrategy: 'full' })).toThrow(/runtime/i);
    expect(createInvalid({ mode: 'static', rendererFactory: () => undefined })).toThrow(/runtime/i);
    expect(createInvalid({ mode: 'static', onDiagnostic: () => undefined })).toThrow(/runtime/i);
    expect(createInvalid({ mode: 'incremental' })).toThrow(/runtime/i);
  });

  it('拒绝 runtime accessor 且不执行外部 getter', () => {
    const getter = vi.fn(() => 'static');
    const runtime = Object.defineProperty({}, 'mode', { enumerable: true, get: getter });

    expect(() => renderToString(<Layout ir={source} runtime={runtime as never} />)).toThrow(/runtime/i);
    expect(getter).not.toHaveBeenCalled();
  });
});
