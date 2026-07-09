import { describe, expect, it } from 'vitest';

import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import {
  buildControlsKey,
  controlModules,
  resolvePreviewControls,
} from '../../src/modules/docs/components/component-preview';

describe('preview controls registry', () => {
  it('exports the public registry helpers from the top-level barrel only', () => {
    expect(buildControlsKey).toBeTypeOf('function');
    expect(controlModules).toBeTypeOf('object');
    expect(resolvePreviewControls).toBeTypeOf('function');
    expect(componentPreviewExports).not.toHaveProperty('demoModules');
    expect(componentPreviewExports).not.toHaveProperty('buildAnimationControlSlots');
    expect(componentPreviewExports).not.toHaveProperty('buildConfiguredControlSlots');
    expect(componentPreviewExports).not.toHaveProperty('buildPreviewToolSlots');
    expect(componentPreviewExports).not.toHaveProperty('ANIMATION_PAUSED_CONTROL_ID');
    expect(componentPreviewExports).not.toHaveProperty('buildAnimationSlots');
    expect(componentPreviewExports).not.toHaveProperty('ANIM_PAUSE_ID');
  });

  it('uses .controls.ts keys', () => {
    expect(buildControlsKey(['viz', 'grammar', 'mark', 'path'], 'line-curve')).toBe(
      '../../contents/viz/grammar/mark/path/line-curve.controls.ts',
    );
    expect(buildControlsKey(['viz', 'grammar', 'mark', 'path'], 'line-closure')).toBe(
      '../../contents/viz/grammar/mark/path/line-closure.controls.ts',
    );
    expect(buildControlsKey(['viz', 'grammar', 'mark', 'path'], 'line-stack-area')).toBe(
      '../../contents/viz/grammar/mark/path/line-stack-area.controls.ts',
    );
  });

  it('resolves named *Controls exports only', () => {
    const controls = [{ kind: 'input', id: 'size', label: 'Size', defaultValue: '6' }];

    expect(resolvePreviewControls({ lineCurveControls: controls })).toBe(controls);
    expect(resolvePreviewControls({ lineCurveActions: controls })).toBeUndefined();
  });

  it('loads current path mark controls from all migrated control files', () => {
    const segments = ['viz', 'grammar', 'mark', 'path'];

    expect(resolvePreviewControls(controlModules[buildControlsKey(segments, 'line-curve')])).toBeDefined();
    expect(resolvePreviewControls(controlModules[buildControlsKey(segments, 'line-closure')])).toBeDefined();
    expect(resolvePreviewControls(controlModules[buildControlsKey(segments, 'line-stack-area')])).toBeDefined();
  });
});
