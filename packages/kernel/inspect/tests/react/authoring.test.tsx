// @vitest-environment jsdom
import { Step } from '@retikz/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUILTIN_INSPECTORS, createInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '../../src';
import { InspectLayout, InspectPath, InspectScope } from '../../src/react';

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

    expect(retained).toContain('#2563eb');
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
    expect(html).not.toContain('#2563eb');
  });

  it('Inspect 根入口源码不静态加载 React optional peer', () => {
    const rootEntry = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

    expect(rootEntry).not.toMatch(/@retikz\/react|['"]\.\/react/);
  });
});
