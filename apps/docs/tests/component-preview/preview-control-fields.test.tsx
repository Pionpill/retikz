// @vitest-environment jsdom
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  PreviewControlField,
  PreviewControlValue,
} from '../../src/modules/docs/components/component-preview/types';

import { PreviewControlFieldInput } from '../../src/modules/docs/components/component-preview/controls';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

class ResizeObserverMock implements ResizeObserver {
  disconnect = (): void => undefined;
  observe = (): void => undefined;
  unobserve = (): void => undefined;
}

Object.assign(globalThis, { ResizeObserver: ResizeObserverMock });
Object.assign(HTMLElement.prototype, {
  hasPointerCapture: () => false,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
  setPointerCapture: () => undefined,
});

type RenderedField = {
  container: HTMLDivElement;
  root: Root;
};

const renderedRoots: Array<Root> = [];

const setInputValue = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const renderField = async (
  field: PreviewControlField,
  value: PreviewControlValue,
  onValueChange: (value: PreviewControlValue) => void = () => undefined,
  compact = false,
): Promise<RenderedField> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  renderedRoots.push(root);

  await act(() =>
    root.render(
      <PreviewControlFieldInput field={field} value={value} compact={compact} onValueChange={onValueChange} />,
    ),
  );
  return { container, root };
};

afterEach(async () => {
  for (const root of renderedRoots.splice(0)) {
    await act(() => root.unmount());
  }
  document.body.replaceChildren();
});

describe('PreviewControlFieldInput', () => {
  it('用 shadcn 组件渲染六种字段', async () => {
    const text = await renderField({ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }, 'Node');
    const number = await renderField(
      { kind: 'number', id: 'width', label: 'Width', defaultValue: 2, min: 0, max: 10, step: 0.5 },
      2,
    );
    const select = await renderField(
      {
        kind: 'select',
        id: 'shape',
        label: 'Shape',
        defaultValue: 'rectangle',
        options: [{ value: 'rectangle', label: 'Rectangle' }],
      },
      'rectangle',
    );
    const toggle = await renderField({ kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: false }, false);
    const color = await renderField({ kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#ffffff' }, '#ffffff');
    const range = await renderField(
      { kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 1, min: 0, max: 1, step: 0.1 },
      1,
    );

    expect(text.container.querySelector('[data-slot="input"][type="text"]')).not.toBeNull();
    expect(number.container.querySelector('[data-slot="input"][type="number"]')).not.toBeNull();
    expect(select.container.querySelector('[data-slot="select-trigger"]')).not.toBeNull();
    expect(toggle.container.querySelector('[data-slot="switch"]')).not.toBeNull();
    expect(color.container.querySelectorAll('[data-slot="input"]')).toHaveLength(2);
    expect(range.container.querySelector('[data-slot="slider"]')).not.toBeNull();
  });

  it('compact 字段使用 small 尺寸且保持可收缩宽度', async () => {
    const text = await renderField(
      { kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' },
      'Node',
      () => undefined,
      true,
    );
    const select = await renderField(
      {
        kind: 'select',
        id: 'shape',
        label: 'Shape',
        defaultValue: 'rectangle',
        options: [{ value: 'rectangle', label: 'Rectangle' }],
      },
      'rectangle',
      () => undefined,
      true,
    );
    const number = await renderField(
      { kind: 'number', id: 'width', label: 'Width', defaultValue: 2 },
      2,
      () => undefined,
      true,
    );
    const color = await renderField(
      { kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#ffffff' },
      '#ffffff',
      () => undefined,
      true,
    );

    const textInput = text.container.querySelector('[data-slot="input"]');
    const numberInput = number.container.querySelector('[data-slot="input"]');
    const colorTextInput = color.container.querySelector('input[type="text"]');

    expect(textInput?.classList.contains('h-7')).toBe(true);
    expect(textInput?.classList.contains('w-full')).toBe(true);
    expect(numberInput?.classList.contains('w-full')).toBe(true);
    expect(colorTextInput?.classList.contains('w-full')).toBe(true);
    expect(select.container.querySelector('[data-slot="select-trigger"]')?.getAttribute('data-size')).toBe('sm');
    expect(select.container.querySelector('[data-slot="select-trigger"]')?.classList.contains('min-w-0')).toBe(true);
  });

  it('range 在 default 与 compact 密度下都占满可用宽度', async () => {
    const field: PreviewControlField = {
      kind: 'range',
      id: 'opacity',
      label: 'Opacity',
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.1,
    };
    const defaultRange = await renderField(field, 1);
    const compactRange = await renderField(field, 1, () => undefined, true);

    expect(defaultRange.container.firstElementChild?.classList.contains('w-full')).toBe(true);
    expect(compactRange.container.firstElementChild?.classList.contains('w-full')).toBe(true);
    for (const range of [defaultRange, compactRange]) {
      const value = range.container.querySelector('.tabular-nums');
      expect(value?.classList.contains('w-6')).toBe(true);
      expect(value?.classList.contains('w-10')).toBe(false);
    }
  });

  it('从 text、number、switch 与 color 发出对应类型的值', async () => {
    const onTextChange = vi.fn();
    const text = await renderField(
      { kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' },
      'Node',
      onTextChange,
    );
    const textInput = text.container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(textInput).not.toBeNull();
    await act(() => {
      if (textInput) {
        setInputValue(textInput, 'Changed');
      }
    });
    expect(onTextChange).toHaveBeenLastCalledWith('Changed');

    const onNumberChange = vi.fn();
    const number = await renderField(
      { kind: 'number', id: 'width', label: 'Width', defaultValue: 2 },
      2,
      onNumberChange,
    );
    const numberInput = number.container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(numberInput).not.toBeNull();
    await act(() => {
      if (numberInput) {
        setInputValue(numberInput, '4.5');
      }
    });
    expect(onNumberChange).toHaveBeenLastCalledWith(4.5);

    const onSwitchChange = vi.fn();
    const toggle = await renderField(
      { kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: false },
      false,
      onSwitchChange,
    );
    const switchButton = toggle.container.querySelector<HTMLButtonElement>('[data-slot="switch"]');
    expect(switchButton).not.toBeNull();
    await act(() => switchButton?.click());
    expect(onSwitchChange).toHaveBeenLastCalledWith(true);

    const onColorChange = vi.fn();
    const color = await renderField(
      { kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#ffffff' },
      '#ffffff',
      onColorChange,
    );
    const colorText = color.container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(colorText).not.toBeNull();
    await act(() => {
      if (colorText) {
        setInputValue(colorText, '#112233');
      }
    });
    expect(onColorChange).toHaveBeenLastCalledWith('#112233');
  });

  it('忽略空或非有限 number 输入', async () => {
    const onValueChange = vi.fn();
    const number = await renderField(
      { kind: 'number', id: 'width', label: 'Width', defaultValue: 2 },
      2,
      onValueChange,
    );
    const input = number.container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input).not.toBeNull();

    await act(() => {
      if (input) {
        setInputValue(input, '');
      }
    });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('通过键盘从 select 与 range 发出字符串和数值', async () => {
    const onSelectChange = vi.fn();
    const select = await renderField(
      {
        kind: 'select',
        id: 'shape',
        label: 'Shape',
        defaultValue: 'rectangle',
        options: [
          { value: 'rectangle', label: 'Rectangle' },
          { value: 'circle', label: 'Circle' },
        ],
      },
      'rectangle',
      onSelectChange,
    );
    const trigger = select.container.querySelector<HTMLElement>('[data-slot="select-trigger"]');
    expect(trigger).not.toBeNull();
    await act(() => trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    const options = document.body.querySelectorAll<HTMLElement>('[data-slot="select-item"]');
    expect(options).toHaveLength(2);
    await act(() => options[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onSelectChange).toHaveBeenLastCalledWith('circle');

    const onRangeChange = vi.fn();
    const range = await renderField(
      { kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
      0.5,
      onRangeChange,
    );
    const thumb = range.container.querySelector<HTMLElement>('[data-slot="slider-thumb"]');
    expect(thumb).not.toBeNull();
    await act(() => thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(onRangeChange).toHaveBeenLastCalledWith(0.6);
  });
});
