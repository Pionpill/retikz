import { describe, expect, it } from 'vitest';

import {
  FLEX_LAYOUT_INSPECTOR,
  FLEX_LAYOUT_INSPECTOR_KEY,
  GRID_LAYOUT_INSPECTOR,
  GRID_LAYOUT_INSPECTOR_KEY,
  OVERLAY_LAYOUT_INSPECTOR,
  OVERLAY_LAYOUT_INSPECTOR_KEY,
} from '../../src/inspect';

describe('Layout Inspector definitions', () => {
  it('uses the Layout package namespace for every registry key', () => {
    expect(FLEX_LAYOUT_INSPECTOR_KEY).toEqual({ namespace: 'layout', type: 'flex-layout' });
    expect(GRID_LAYOUT_INSPECTOR_KEY).toEqual({ namespace: 'layout', type: 'grid-layout' });
    expect(OVERLAY_LAYOUT_INSPECTOR_KEY).toEqual({ namespace: 'layout', type: 'overlay-layout' });
  });

  it('binds each definition to the exact Layout composite owner', () => {
    expect(FLEX_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'layout', type: 'flexLayout' });
    expect(GRID_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'layout', type: 'gridLayout' });
    expect(OVERLAY_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'layout', type: 'overlayLayout' });
  });

  it('keeps Inspector definitions independent from the root composite definitions', async () => {
    const layout = await import('../../src');

    expect(layout.FlexLayoutDefinition).not.toHaveProperty('inspector');
    expect(layout.GridLayoutDefinition).not.toHaveProperty('inspector');
    expect(layout.OverlayLayoutDefinition).not.toHaveProperty('inspector');
    expect(layout).not.toHaveProperty('FlexLayoutInspectOptionsSchema');
  });
});
