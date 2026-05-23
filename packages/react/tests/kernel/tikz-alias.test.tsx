/**
 * <Layout> 主名 + <TikZ> deprecated alias（ADR-03）
 * @description Layout 渲染；TikZ alias 渲染与 Layout 完全一致；dev 下 alias 只 warn 一次（fail-open）；
 *   确定性生产（NODE_ENV=production）静默。每个用例 vi.resetModules 隔离模块级 once-warn flag
 */
import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Node } from '../../src/kernel/Node';
import type { LayoutProps } from '../../src/kernel/Layout';

const renderWith = (Comp: FC<LayoutProps>): string =>
  renderToStaticMarkup(
    <Comp width={100} height={50}>
      <Node id="a" position={[0, 0]}>
        Hi
      </Node>
    </Comp>,
  );

describe('<Layout> 主名 + <TikZ> deprecated alias', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('Layout 渲染出 <svg>', async () => {
    const { Layout } = await import('../../src/kernel/Layout');
    expect(renderWith(Layout)).toContain('<svg');
  });

  it('TikZ alias 渲染与 Layout 完全一致', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { Layout, TikZ } = await import('../../src/kernel/Layout');
    expect(renderWith(TikZ)).toBe(renderWith(Layout));
  });

  it('dev 下 TikZ alias 多次渲染只 warn 一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { TikZ } = await import('../../src/kernel/Layout');
    renderWith(TikZ);
    renderWith(TikZ);
    renderWith(TikZ);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('<TikZ> is deprecated');
  });

  it('确定性生产（NODE_ENV=production）下 TikZ alias 静默', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { TikZ } = await import('../../src/kernel/Layout');
    renderWith(TikZ);
    expect(warn).not.toHaveBeenCalled();
  });
});
