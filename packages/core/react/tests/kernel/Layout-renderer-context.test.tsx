import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Layout, Node, RendererModeProvider } from '../../src';

/**
 * <Layout> 渲染目标 context 回退
 * @description renderer 解析优先级：显式 prop > RendererModeProvider 注入的 context > 默认 svg。
 *   用途：外层（如文档预览）切换无法改其内部 <Layout renderer> 的交互式子树的 svg/canvas
 */
describe('<Layout> 渲染目标 context 回退', () => {
  const chart = (
    <Layout width={100} height={100}>
      <Node id="a" position={[0, 0]}>
        A
      </Node>
    </Layout>
  );

  it('无 renderer prop 时跟随 RendererModeProvider 切到 canvas', () => {
    const html = renderToStaticMarkup(<RendererModeProvider mode="canvas">{chart}</RendererModeProvider>);
    expect(html).toContain('<canvas');
    expect(html).not.toContain('<svg');
  });

  it('默认（无 provider、无 prop）仍是 svg', () => {
    const html = renderToStaticMarkup(chart);
    expect(html).toContain('<svg');
    expect(html).not.toContain('<canvas');
  });

  it('显式 renderer prop 优先于 context', () => {
    const html = renderToStaticMarkup(
      <RendererModeProvider mode="canvas">
        <Layout width={100} height={100} renderer="svg">
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>
      </RendererModeProvider>,
    );
    expect(html).toContain('<svg');
    expect(html).not.toContain('<canvas');
  });
});
