import { resolveCoreThemeStyleColors, ThemeMode } from '@retikz/core';
import { compositeOpaqueColor } from '@retikz/foundation';
import { GraphStatus } from '@retikz/graph';
// @vitest-environment jsdom
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreviewControlState } from '../../src/modules/docs/components/component-preview';
import { PreviewPanel, usePreviewPanelState } from '../../src/modules/docs/components/component-preview/preview-panel';
import type { PreviewTheme } from '../../src/modules/docs/components/component-preview/theme';
import EntityPlayground from '../../src/modules/docs/contents/schematic/graph/entity/usage/entity-playground';
import { previewControlContract } from '../../src/modules/docs/contents/schematic/graph/entity/usage/entity-playground.controls';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export type EntityStatusPreviewProps = {
  theme: PreviewTheme;
};

/** 以真实 PreviewPanel 链路驱动 Entity status control */
const EntityStatusPreview: FC<EntityStatusPreviewProps> = props => {
  const { theme } = props;
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
      <PreviewPanel state={state} Component={EntityPlayground} theme={theme} />
    </>
  );
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('Graph status preview', () => {
  it.each([ThemeMode.Light, ThemeMode.Dark])(
    'updates the default semantic appearance after a status change: %s',
    mode => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

      act(() => root.render(<EntityStatusPreview theme={{ mode }} />));
      const initialFill = container.querySelector('svg [fill]')?.getAttribute('fill');
      act(() => container.querySelector<HTMLButtonElement>('button')?.click());

      expect(container.querySelector('[data-testid="status"]')?.textContent).toBe(GraphStatus.Error);
      const entityShape = container.querySelector('svg [fill]');
      expect(entityShape?.getAttribute('fill')).not.toBe(initialFill);
      expect(entityShape?.getAttribute('stroke')).toBe(
        compositeOpaqueColor(resolveCoreThemeStyleColors(mode, {}).semantic.error, '#ffffff', 1),
      );

      act(() => root.unmount());
    },
  );
});
