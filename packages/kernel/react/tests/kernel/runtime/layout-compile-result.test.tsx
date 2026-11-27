import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';

// @vitest-environment jsdom
import type { CompileResult } from '@retikz/reconciler';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { literal, number, strictObject } from 'zod';

import { Layout } from '../../../src';
import { compileTestResult } from '../../helpers/compilation';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    width: number(),
  }),
  artifactSchema: strictObject({ width: number() }),
  compile: node => ({
    children: [{ type: 'node', position: [0, 0], layout: { minimumSize: { width: node.width, height: 10 } } }],
    artifact: { width: node.width },
  }),
});

const scene = (width: number) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: [{ namespace: 'third', type: 'card', width }],
});

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<Layout onCompileResult>', () => {
  it('在 SSR 渲染期间不发布用户回调', () => {
    const onCompileResult = vi.fn();
    renderToStaticMarkup(<Layout ir={scene(10)} compile={{ composites: [card] }} onCompileResult={onCompileResult} />);

    expect(onCompileResult).not.toHaveBeenCalled();
  });

  it.each(['full', 'incremental'] as const)('以 %s 模式发布提交的完整结果', async mode => {
    const onCompileResult = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout
          ir={scene(10)}
          compile={{ composites: [card] }}
          onCompileResult={onCompileResult}
          reconciler={{ mode }}
        />,
      ),
    );

    expect(onCompileResult).toHaveBeenCalledTimes(1);
    expect(onCompileResult.mock.calls[0]?.[0].artifacts[0]?.value.width).toBe(10);

    await act(() => root.unmount());
  });

  it('保留直接编译的Scene 和领域产物', async () => {
    const compile = { composites: [card], padding: 36, precision: 1 };
    const direct = compileTestResult(scene(10), compile);
    const onCompileResult = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(<Layout ir={scene(10)} compile={compile} onCompileResult={onCompileResult} />));

    const reactResult = onCompileResult.mock.calls[0]?.[0] as CompileResult;
    expect(reactResult).toEqual(direct);
    await act(() => root.unmount());
  });

  it('移除 compile 后恢复默认编译配置', async () => {
    const ir: IRScene = { type: 'scene', version: 1, children: [{ type: 'node', id: 'n', position: [0, 0] }] };
    const onCompileResult = vi.fn();
    const root = createRoot(document.createElement('div'));
    await act(() => root.render(<Layout ir={ir} compile={{ padding: 40 }} onCompileResult={onCompileResult} />));
    expect(onCompileResult).toHaveBeenLastCalledWith(compileTestResult(ir, { padding: 40 }));
    await act(() => root.render(<Layout ir={ir} onCompileResult={onCompileResult} />));
    expect(onCompileResult).toHaveBeenLastCalledWith(compileTestResult(ir));
    await act(() => root.unmount());
  });

  it('将每个成功的保留模式更新发布一次', async () => {
    const onCompileResult = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(<Layout ir={scene(10)} compile={{ composites: [card] }} onCompileResult={onCompileResult} />),
    );
    const initial = onCompileResult.mock.calls[0]?.[0];
    await act(() =>
      root.render(<Layout ir={scene(20)} compile={{ composites: [card] }} onCompileResult={onCompileResult} />),
    );

    expect(onCompileResult).toHaveBeenCalledTimes(2);
    expect(initial?.artifacts[0]?.value.width).toBe(10);
    expect(onCompileResult.mock.calls[1]?.[0].artifacts[0]?.value.width).toBe(20);
    expect(onCompileResult.mock.calls[1]?.[0]).not.toBe(initial);

    await act(() => root.unmount());
  });

  it('隔离保留宿主提交后的回调失败', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = document.createElement('div');
    const root = createRoot(container);
    let committed: CompileResult | undefined;
    const onCompileResult = vi.fn((result: CompileResult) => {
      committed = result;
      throw new Error('callback failed');
    });

    await act(() =>
      root.render(<Layout ir={scene(10)} compile={{ composites: [card] }} onCompileResult={onCompileResult} />),
    );

    expect(container.querySelector('svg')).not.toBeNull();
    expect(onCompileResult).toHaveBeenCalledTimes(1);
    expect(committed?.artifacts).toHaveLength(1);
    expect(Object.isFrozen(committed?.artifacts)).toBe(true);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('onCompileResult callback failed'), expect.any(Error));

    await act(() => root.unmount());
  });
});
