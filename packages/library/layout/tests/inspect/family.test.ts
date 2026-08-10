import { describe, expect, it } from 'vitest';

import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '../../src/inspect';

describe('Layout Inspector definitions', () => {
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
