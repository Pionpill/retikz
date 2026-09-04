// @vitest-environment jsdom
import type { FC } from 'react';

import { ThemeMode } from '@retikz/core';
import { GraphStatus } from '@retikz/graph';
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreviewControlState } from '../../src/modules/docs/components/component-preview';
import type { PreviewTheme } from '../../src/modules/docs/components/component-preview/theme';

import { PreviewPanel, usePreviewPanelState } from '../../src/modules/docs/components/component-preview/preview-panel';
import { PreviewThemeStyle } from '../../src/modules/docs/components/component-preview/theme';
import { previewControlContract } from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-participant.controls';
import EntityParticipantDemo from '../../src/modules/docs/contents/schematic/graph/entity/basic/entity-participant.zh.demo';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export type EntityStatusPreviewProps = {
  themeStyle: NonNullable<PreviewTheme['style']>;
};

/** 以真实 PreviewPanel 链路驱动 Entity status control。 */
const EntityStatusPreview: FC<EntityStatusPreviewProps> = props => {
  const { themeStyle } = props;
  const [values, setValues] = useState({ ...previewControlContract.canonicalValues });
  const controlState = useMemo<PreviewControlState>(
    () => ({
      canonicalValues: previewControlContract.canonicalValues,
      values,
      setValue: (id, value) => setValues(current => ({ ...current, [id]: value })),
      applyValues: nextValues => setValues({ ...previewControlContract.canonicalValues, ...nextValues }),
      reset: () => setValues({ ...previewControlContract.canonicalValues }),
    }),
    [values],
  );
  const state = usePreviewPanelState({
    controlState,
    rendererMode: 'svg',
    size: 'sm',
    dragEnabled: false,
    expanded: false,
  });

  return (
    <>
      <button type="button" onClick={() => controlState.setValue('status', GraphStatus.Error)}>
        Mark error
      </button>
      <output data-testid="status">{String(values.status)}</output>
      <PreviewPanel
        state={state}
        Component={EntityParticipantDemo}
        theme={{ style: themeStyle, mode: ThemeMode.Light }}
      />
    </>
  );
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('Graph status preview', () => {
  it('uses the Vibrant semantic error color after an Entity status control changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    act(() => root.render(<EntityStatusPreview themeStyle={PreviewThemeStyle.Vibrant} />));
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());

    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(GraphStatus.Error);
    expect(container.querySelector('svg [fill]')?.getAttribute('fill')).toBe('#e93a48');

    act(() => root.unmount());
  });

  it('preserves the Clean no-fill treatment after an Entity status control changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    act(() => root.render(<EntityStatusPreview themeStyle={PreviewThemeStyle.Clean} />));
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());

    expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(GraphStatus.Error);
    expect(container.querySelector('svg [fill]')?.getAttribute('fill')).toBe('none');

    act(() => root.unmount());
  });

  it('preserves the Academic derived fill and current-color outline after an Entity status control changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    act(() => root.render(<EntityStatusPreview themeStyle={PreviewThemeStyle.Academic} />));
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());

    const entityShape = container.querySelector('svg [fill]');
    expect(entityShape?.getAttribute('fill')).toBe('#f4dede');
    expect(entityShape?.getAttribute('stroke')).toBe('currentColor');

    act(() => root.unmount());
  });
});
