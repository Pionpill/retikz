// @vitest-environment jsdom

import type { FC } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import '../../src/i18n';
import { ComponentPreviewCard } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';
import { definePreviewControls } from '../../src/modules/docs/components/component-preview/controls';
import type { ComponentRenderSource } from '../../src/modules/docs/components/component-preview/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const Demo: FC = () => <div>图形预览</div>;

const source: ComponentRenderSource = {
  react: { files: [{ filename: 'example.tsx', code: 'export default null;', lang: 'tsx' }] },
};

afterEach(() => document.body.replaceChildren());

describe('ComponentPreview showcase data tab', () => {
  it('shows control table views in both the data tab and bottom bar', () => {
    const controls = definePreviewControls({
      presentation: 'panel',
      title: '数据',
      sections: [
        {
          label: '数据',
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: '输入输出',
              views: [
                { id: 'input', label: '输入', rows: [{ value: 1 }] },
                { id: 'output', label: '输出', rows: [{ value: 2 }] },
              ],
            },
          ],
        },
      ],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() =>
      root.render(
        <ComponentPreviewCard
          name="data-example"
          Component={Demo}
          mode="showcase"
          source={source}
          controlDefinition={controls}
        />,
      ),
    );

    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="展示视图"] [role="tab"]')];

    expect(tabs.map(tab => tab.textContent)).toEqual(['预览', '数据', '代码']);

    const bottomBar = container.querySelector('[data-slot="preview-control-bar"]');

    expect(bottomBar?.textContent).toContain('输入输出');

    act(() => tabs[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })));
    const dataPanel = container.querySelector('[data-slot="showcase-data"]');

    expect(dataPanel?.textContent).toContain('输入输出');
    expect(dataPanel?.textContent).toContain('1');
    expect(dataPanel?.classList.contains('h-full')).toBe(true);

    const scrollArea = dataPanel?.querySelector<HTMLElement>('[data-slot="preview-table-scroll-area"]');

    expect(scrollArea?.classList.contains('flex-1')).toBe(true);
    expect(scrollArea?.style.maxHeight).toBe('');

    const outputButton = dataPanel?.querySelector<HTMLButtonElement>('[data-view-id="output"]');

    expect(outputButton).not.toBeNull();

    act(() => outputButton!.click());

    expect(dataPanel?.querySelector('[data-slot="preview-table-row"]')?.textContent).toBe('2');

    act(() => root.unmount());
  });

  it('omits the data tab when no visible table control exists', () => {
    const controls = definePreviewControls({
      presentation: 'panel',
      title: '外观',
      sections: [{ label: '外观', controls: [{ kind: 'switch', id: 'visible', label: '显示', defaultValue: true }] }],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() =>
      root.render(
        <ComponentPreviewCard
          name="style-example"
          Component={Demo}
          mode="showcase"
          source={source}
          controlDefinition={controls}
        />,
      ),
    );

    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="展示视图"] [role="tab"]')];

    expect(tabs.map(tab => tab.textContent)).toEqual(['预览', '代码']);

    act(() => root.unmount());
  });
});
