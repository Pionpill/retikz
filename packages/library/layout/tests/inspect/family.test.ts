import { describe, expect, it } from 'vitest';

import {
  FLEX_LAYOUT_INSPECTOR,
  FLEX_LAYOUT_INSPECTOR_KEY,
  GRID_LAYOUT_INSPECTOR,
  GRID_LAYOUT_INSPECTOR_KEY,
  OVERLAY_LAYOUT_INSPECTOR,
  OVERLAY_LAYOUT_INSPECTOR_KEY,
} from '../../src/inspect';

describe('Layout Inspector 定义', () => {
  it('对每个注册表项使用 Layout 包命名空间', () => {
    expect(FLEX_LAYOUT_INSPECTOR_KEY).toEqual({ namespace: 'layout', type: 'flex-layout' });
    expect(GRID_LAYOUT_INSPECTOR_KEY).toEqual({ namespace: 'layout', type: 'grid-layout' });
    expect(OVERLAY_LAYOUT_INSPECTOR_KEY).toEqual({ namespace: 'layout', type: 'overlay-layout' });
  });

  it('将每个定义绑定到确切的 Layout 复合所属模块', () => {
    expect(FLEX_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'layout', type: 'flexLayout' });
    expect(GRID_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'layout', type: 'gridLayout' });
    expect(OVERLAY_LAYOUT_INSPECTOR.owner).toEqual({ kind: 'composite', namespace: 'layout', type: 'overlayLayout' });
  });

  it('使 Inspector 定义独立于根复合定义', async () => {
    const layout = await import('../../src');

    expect(layout.flexLayoutDefinition).not.toHaveProperty('inspector');
    expect(layout.gridLayoutDefinition).not.toHaveProperty('inspector');
    expect(layout.overlayLayoutDefinition).not.toHaveProperty('inspector');
    expect(layout).not.toHaveProperty('FlexLayoutInspectOptionsSchema');
  });
});
