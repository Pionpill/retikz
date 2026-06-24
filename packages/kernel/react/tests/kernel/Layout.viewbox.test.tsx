/**
 * <Layout viewBox> 渲染测试
 * @description Layout 接受 viewBox prop 并注入构造出的 IR 根，使 `<svg viewBox="x y w h">` 用显式视框；
 *   直接传 ir prop 且 IR 自带 viewBox 时尊重 IR 内置值（prop 缺省不覆盖）；prop 与 IR 内置冲突时 prop 优先。
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Layout, Node } from '../../src';
import type { IR } from '@retikz/core';

describe('<Layout viewBox> 注入显式视框', () => {
  it('viewBox prop → <svg viewBox="x y w h">', () => {
    const svg = renderToStaticMarkup(
      <Layout viewBox={{ x: -100, y: -100, width: 200, height: 200 }}>
        <Node id="o" position={[0, 0]} shape="circle" minimumSize={40} fill="#2563eb" />
      </Layout>,
    );
    expect(svg).toContain('viewBox="-100 -100 200 200"');
  });

  it('不传 viewBox 时回退自动算视框（svg 仍有 viewBox 属性）', () => {
    const svg = renderToStaticMarkup(
      <Layout>
        <Node id="o" position={[0, 0]} shape="circle" minimumSize={40} fill="#2563eb" />
      </Layout>,
    );
    expect(svg).toContain('viewBox=');
    expect(svg).not.toContain('viewBox="-100 -100 200 200"');
  });
});

describe('viewBox prop 与 IR 内置值的优先级', () => {
  it('直接传 ir 且 IR 自带 viewBox、prop 缺省 → 用 IR 内置值', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'o', shape: 'circle', position: [0, 0], minimumSize: 40, fill: '#2563eb' },
      ],
      viewBox: { x: -50, y: -50, width: 100, height: 100 },
    };
    const svg = renderToStaticMarkup(<Layout ir={ir} />);
    expect(svg).toContain('viewBox="-50 -50 100 100"');
  });

  it('IR 自带 viewBox 且又传 viewBox prop → prop 优先', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'o', shape: 'circle', position: [0, 0], minimumSize: 40, fill: '#2563eb' },
      ],
      viewBox: { x: -50, y: -50, width: 100, height: 100 },
    };
    const svg = renderToStaticMarkup(
      <Layout ir={ir} viewBox={{ x: -100, y: -100, width: 200, height: 200 }} />,
    );
    expect(svg).toContain('viewBox="-100 -100 200 200"');
    expect(svg).not.toContain('viewBox="-50 -50 100 100"');
  });
});
