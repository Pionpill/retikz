// @vitest-environment jsdom

import type { FC } from 'react';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentPreviewDialogProps } from '../../src/modules/docs/components/component-preview/ComponentPreviewDialog';

import { definePreviewControls } from '../../src/modules/docs/components/component-preview';
import { ComponentPreviewCard } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';

const dialogCapture = vi.hoisted(() => ({ props: [] as Array<ComponentPreviewDialogProps> }));

vi.mock('../../src/modules/docs/components/component-preview/ComponentPreviewDialog', () => ({
  ComponentPreviewDialog: (props: ComponentPreviewDialogProps) => {
    dialogCapture.props.push(props);
    return (
      <button type="button" aria-label="Mock dialog close" onClick={props.onClose}>
        Close
      </button>
    );
  },
}));

vi.mock('../../src/modules/docs/store', () => {
  const state = {
    hideCode: false,
    isExpand: false,
    rendererMode: 'svg',
    dragEnabled: false,
    controlPanelDefaultOpen: true,
  };
  return {
    useComponentPreviewStore: Object.assign((selector: (snapshot: typeof state) => unknown) => selector(state), {
      getState: () => state,
    }),
  };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const Demo: FC = () => null;
const panelDefinition = definePreviewControls({
  presentation: 'panel',
  sections: [
    {
      controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }],
    },
  ],
});

afterEach(() => {
  dialogCapture.props.length = 0;
  document.body.replaceChildren();
});

describe('ComponentPreviewCard dialog boundary', () => {
  it('正文 Card 使用 compact 属性字段', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ComponentPreviewCard name="compact-controls" Component={Demo} controlDefinition={panelDefinition} />,
      );
    });

    expect(container.querySelector('aside')?.getAttribute('data-density')).toBe('compact');

    act(() => root.unmount());
  });

  it('带属性面板的 Card 最小使用 md 尺寸', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ComponentPreviewCard
          name="minimum-panel-size"
          Component={Demo}
          size="xs"
          controlDefinition={panelDefinition}
        />,
      );
    });

    const workspace = container.querySelector('[data-slot="preview-workspace"]');
    expect(workspace?.classList.contains('h-56')).toBe(true);
    expect(workspace?.classList.contains('h-32')).toBe(false);
    expect(container.querySelector('button[aria-label="Preview size md"]')?.getAttribute('data-state')).toBe('on');

    act(() => root.unmount());
  });

  it('将 previewClassName 合并到 inline 预览容器', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ComponentPreviewCard name="preview-class-name" Component={Demo} previewClassName="card-preview-class" />,
      );
    });

    expect(container.querySelector('.card-preview-class')).not.toBeNull();
    expect(container.querySelector('[data-slot="preview-workspace"]')?.classList.contains('h-56')).toBe(true);
    expect(container.querySelector('.card-preview-class')?.classList.contains('h-full')).toBe(true);

    act(() => root.unmount());
  });

  it('卡片局部 size 改动后仍把原始 size 作为 dialog initialSize', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ComponentPreviewCard name="original-size" Component={Demo} size="sm" />);
    });
    const sizeButton = container.querySelector<HTMLButtonElement>('button[aria-label="Preview size xl"]');
    expect(sizeButton).not.toBeNull();
    expect(sizeButton!.getAttribute('data-state')).toBe('off');

    act(() => sizeButton!.click());
    expect(sizeButton!.getAttribute('data-state')).toBe('on');
    const maximizeButton = container.querySelector<HTMLButtonElement>('button[aria-label="Maximize"]');
    expect(maximizeButton).not.toBeNull();
    act(() => maximizeButton!.click());

    expect(dialogCapture.props).toHaveLength(1);
    expect(dialogCapture.props[0].initialSize).toBe('sm');

    act(() => root.unmount());
  });
});
