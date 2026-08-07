import { describe, expect, it } from 'vitest';

import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '../../src/inspect';

describe('Standard layout Inspector definitions', () => {
  it('binds each definition to the exact Standard composite owner', () => {
    expect(FLEX_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'standard', type: 'flexLayout' });
    expect(GRID_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'standard', type: 'gridLayout' });
    expect(OVERLAY_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'standard', type: 'overlayLayout' });
  });

  it('keeps Inspector definitions independent from the root composite definitions', async () => {
    const standard = await import('../../src');

    expect(standard.FlexLayoutDefinition).not.toHaveProperty('inspector');
    expect(standard.GridLayoutDefinition).not.toHaveProperty('inspector');
    expect(standard.OverlayLayoutDefinition).not.toHaveProperty('inspector');
    expect(standard).not.toHaveProperty('FlexLayoutInspectOptionsSchema');
  });
});
