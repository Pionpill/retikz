// @vitest-environment jsdom
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiSourceLink } from '../../src/modules/docs/components/mdx-content/source-links';
import { useRightPanelStore } from '../../src/modules/docs/store';

const roots: Array<Root> = [];

beforeEach(() => {
  useRightPanelStore.getState().close();
});

afterEach(() => {
  act(() => {
    roots.splice(0).forEach(root => root.unmount());
  });
  document.body.replaceChildren();
});

describe('<ApiSourceLink>', () => {
  it('点击摘要后在右侧源码面板打开对应声明，而不导航页面', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <ApiSourceLink label="createLowerTex" path="packages/kernel/tex/src/lower/lower-tex.ts" startLine={24}>
          把同步 SVG engine 适配为 Core LowerTex
        </ApiSourceLink>,
      );
    });

    const button = container.querySelector<HTMLButtonElement>('[data-source-link-open]');
    expect(button).not.toBeNull();
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.className).not.toContain('font-medium');

    act(() => {
      button?.click();
    });

    expect(useRightPanelStore.getState().panel).toEqual({
      kind: 'source',
      source: {
        label: 'createLowerTex',
        path: 'packages/kernel/tex/src/lower/lower-tex.ts',
        startLine: 24,
        endLine: undefined,
      },
    });
  });
});
