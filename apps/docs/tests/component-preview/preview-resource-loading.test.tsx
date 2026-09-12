// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { ComponentPreview } from '@/modules/docs/components';
import { DemoLocationContext } from '@/modules/docs/components/component-preview/context';
import {
  buildControlsKey,
  buildIrJsonKey,
  buildLangControlsKey,
  buildSourceFileKey,
  buildVanillaKey,
  loadPreviewResources,
} from '@/modules/docs/components/component-preview/registry';

beforeAll(async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  await i18n.changeLanguage('zh');
});

afterAll(() => {
  vi.restoreAllMocks();
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

const renderAtRoute = (path: string, node: ReactNode): string =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:moduleId/:sectionId/:pageId/:subPageId" element={node} />
      </Routes>
    </MemoryRouter>,
  );

describe('ComponentPreview 资源加载', () => {
  it('跨目录伴随资源使用同一 contents 根路径', () => {
    const segments = ['kernel', 'components', 'introduction'];
    const name = '/about/blog/core-philosophy/pipeline';
    const prefix = '../../contents/about/blog/core-philosophy/pipeline';
    expect(buildControlsKey(segments, name)).toBe(`${prefix}.controls.ts`);
    expect(buildLangControlsKey(segments, name, 'en')).toBe(`${prefix}.en.controls.ts`);
    expect(buildIrJsonKey(segments, name)).toBe(`${prefix}.ir.json`);
    expect(buildVanillaKey(segments, name)).toBe(`${prefix}.vanilla.ts`);
    expect(buildSourceFileKey(segments, `${name}.i18n.ts`)).toBe(`${prefix}.i18n.ts`);
  });
  it.each(['zh', 'en'])('跨目录引用加载同一份 demo 与源码（%s）', async lang => {
    const request = {
      segments: ['about', 'blog', 'core-philosophy'],
      name: 'pipeline',
      lang,
      controlName: null,
      controlsDisabled: false,
      sourceFiles: [],
    };
    const local = await loadPreviewResources(request);
    const shared = await loadPreviewResources({
      ...request,
      segments: ['kernel', 'components', 'introduction'],
      name: '/about/blog/core-philosophy/pipeline',
    });
    expect(local.status).toBe('ready');
    expect(shared).toEqual(local);
  });

  it('不存在的跨目录 demo 保持 missing 诊断', async () => {
    const result = await loadPreviewResources({
      segments: ['kernel', 'components', 'introduction'],
      name: '/about/blog/core-philosophy/missing-demo',
      lang: 'zh',
      controlName: null,
      controlsDisabled: false,
      sourceFiles: [],
    });
    expect(result).toEqual({
      status: 'missing',
      key: '../../contents/about/blog/core-philosophy/missing-demo.demo.tsx',
    });
  });

  it('只加载请求指定的真实 demo 资源', async () => {
    const result = await loadPreviewResources({
      segments: ['kernel', 'components', 'node', 'overview'],
      name: 'node-basic',
      lang: 'zh',
      controlName: null,
      controlsDisabled: false,
      sourceFiles: [],
    });

    expect(result.status).toBe('ready');
  });

  it('首次渲染已存在的 demo 时显示 loading 占位', () => {
    const html = renderAtRoute(
      '/kernel/components/node/overview',
      <DemoLocationContext.Provider value={['kernel', 'components', 'node', 'overview']}>
        <ComponentPreview files="node-basic" />
      </DemoLocationContext.Provider>,
    );

    expect(html).toContain('data-slot="component-preview-loading"');
  });

  it('真实 loader 完成后渲染 preview workspace', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/kernel/components/node/overview']}>
          <Routes>
            <Route
              path="/:moduleId/:sectionId/:pageId/:subPageId"
              element={
                <DemoLocationContext.Provider value={['kernel', 'components', 'node', 'overview']}>
                  <ComponentPreview files="node-basic" />
                </DemoLocationContext.Provider>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('[data-slot="component-preview-loading"]')).toBeInstanceOf(HTMLElement);

    await act(async () => {
      await Promise.resolve();
    });
    await vi.waitFor(
      () => {
        const error = container.querySelector<HTMLElement>('.text-destructive');
        if (error) throw new Error(error.textContent);
        expect(container.querySelector('[data-slot="preview-workspace"]')).toBeInstanceOf(HTMLElement);
      },
      { timeout: 10_000 },
    );

    expect(container.querySelector('[data-slot="component-preview-loading"]')).toBeNull();
  }, 15_000);
});
