// @vitest-environment jsdom
import { Step } from '@retikz/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { BUILTIN_INSPECTORS, createInspectorRegistry, defineInspector, STROKE_PATH_INSPECTOR_KEY } from '../../src';
import { InspectLayout, InspectPath, InspectScope } from '../../src/react';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '../../src/vanilla';

const registry = createInspectorRegistry(BUILTIN_INSPECTORS);

const content = (
  <InspectPath request={{ inspector: STROKE_PATH_INSPECTOR_KEY, value: { labels: true } }}>
    <Step kind="move" to={[0, 0]} />
    <Step kind="cubic" control1={[10, 12]} control2={[20, 12]} to={[30, 0]} />
  </InspectPath>
);

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

const normalizeEmptyElements = (value: string): string => value.replace(/><\/(ellipse|path|rect)>/g, ' />');

describe('@retikz/inspect/react authoring and driver', () => {
  it('可选 Path wrapper 复用基础 Path 并保持 static/retained SSR plane 等价', () => {
    const retained = renderToString(
      <InspectLayout registry={registry} idPrefix="inspect-react">
        {content}
      </InspectLayout>,
    );
    const staticHtml = renderToString(
      <InspectLayout registry={registry} idPrefix="inspect-react" runtime={{ mode: 'static' }}>
        {content}
      </InspectLayout>,
    );

    expect(retained).toContain('hsl(210, 38%, 48%)');
    expect(normalizeEmptyElements(staticHtml)).toBe(normalizeEmptyElements(retained));
  });

  it('retained commit 同时发布 plane 与 diagnostics', async () => {
    const onCommit = vi.fn();
    const onDiagnostic = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <InspectLayout registry={registry} onCommit={onCommit} onDiagnostic={onDiagnostic}>
          {content}
        </InspectLayout>,
      ),
    );

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].inspection?.entries.length).toBeGreaterThan(0);
    expect(onCommit.mock.calls[0]?.[0].primary.scene).toBeDefined();
    expect(onDiagnostic).not.toHaveBeenCalled();
    await act(() => root.unmount());
  });

  it('Scope barrier 阻止后代 Path request 重新开启', () => {
    const html = renderToString(
      <InspectLayout registry={registry} runtime={{ mode: 'static' }}>
        <InspectScope request={false}>{content}</InspectScope>
      </InspectLayout>,
    );

    expect(html).not.toContain('data-retikz-readonly-layer');
    expect(html).not.toContain('hsl(210, 38%, 48%)');
  });

  it('rejects a self request whose authored site owner does not match the Inspector owner', () => {
    const driver = createInspectionVanillaDriver({ registry });
    const session = driver.create({
      instance: {},
      source: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      },
      authoringSites: [
        {
          kind: 'path',
          sourcePath: 'children[0].path',
          owner: { kind: 'composite', namespace: 'fixture', type: 'box' },
          type: 'path',
          authoring: createInspectionVanillaAuthoring({ inspector: STROKE_PATH_INSPECTOR_KEY, value: true }),
        },
      ],
      coreOptions: {},
    });

    expect(() => session.observers[0]?.createSession()).toThrow(/owner/i);
  });

  it('counts composite owners structurally when namespace or type contains a colon', () => {
    const firstOwner = { kind: 'composite' as const, namespace: 'a:b', type: 'c' };
    const secondOwner = { kind: 'composite' as const, namespace: 'a', type: 'b:c' };
    const firstKey = { namespace: 'fixture', type: 'first' };
    const secondKey = { namespace: 'fixture', type: 'second' };
    const definitionFor = (key: typeof firstKey, owner: typeof firstOwner) =>
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.null(),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => [],
      });
    const colonRegistry = createInspectorRegistry([
      definitionFor(firstKey, firstOwner),
      definitionFor(secondKey, secondOwner),
    ]);
    const source = {
      version: 1 as const,
      type: 'scene' as const,
      children: [{ namespace: 'fixture', type: 'host' }],
    };
    const driver = createInspectionVanillaDriver({ registry: colonRegistry });
    const session = driver.create({
      instance: {},
      source,
      authoringSites: [
        {
          kind: 'embeddable',
          sourcePath: 'children[0]',
          owner: firstOwner,
          type: 'first',
          authoring: createInspectionVanillaAuthoring({ inspector: firstKey, value: true }),
        },
        {
          kind: 'embeddable',
          sourcePath: 'children[0]',
          owner: secondOwner,
          type: 'second',
          authoring: createInspectionVanillaAuthoring({ inspector: secondKey, value: true }),
        },
      ],
      coreOptions: {},
    });
    const observer = session.observers[0].createSession();
    const context = {
      theme: {
        mode: 'light',
        colors: {
          semantic: { error: '#error', success: '#success', warning: '#warning', guide: '#guide' },
          categorical: ['#scope'],
        },
      },
      compileFragment: () => ({ scene: {}, artifacts: [], diagnostics: [] }),
    } as never;
    const occurrence = { sourcePath: 'children[0]', expansionPath: [] };
    observer.observe(
      {
        owner: firstOwner,
        occurrence,
        provenance: { origin: occurrence, final: occurrence },
        transform: [1, 0, 0, 1, 0, 0],
        value: null,
      },
      context,
    );
    observer.observe(
      {
        owner: secondOwner,
        occurrence,
        provenance: { origin: occurrence, final: occurrence },
        transform: [1, 0, 0, 1, 0, 0],
        value: null,
      },
      context,
    );

    expect(() => observer.complete()).not.toThrow();
  });

  it('Inspect 根入口源码不静态加载 React optional peer', () => {
    const rootEntry = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

    expect(rootEntry).not.toMatch(/@retikz\/react|['"]\.\/react/);
  });
});
