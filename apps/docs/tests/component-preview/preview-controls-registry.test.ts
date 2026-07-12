import { describe, expect, it } from 'vitest';

import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import {
  buildControlsKey,
  buildLangControlsKey,
  controlModules,
  resolveControlsKey,
  resolvePreviewControls,
} from '../../src/modules/docs/components/component-preview';

describe('preview controls registry', () => {
  it('exports a localized controls key resolver', () => {
    expect((componentPreviewExports as Record<string, unknown>).resolveControlsKey).toBeTypeOf('function');
  });

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

  it('优先解析语言化 controls，并在缺失时回退通用文件', () => {
    const segments = ['viz', 'grammar', 'mark', 'path'];
    const englishKey = buildLangControlsKey(segments, 'line-curve', 'en');

    expect(Object.keys(controlModules).filter(key => key.includes('line-curve'))).toContain(englishKey);
    expect(resolveControlsKey(segments, 'line-curve', 'en')).toBe(englishKey);
    expect(resolveControlsKey(segments, 'line-curve', 'fr')).toBe(buildControlsKey(segments, 'line-curve'));

    const controls = resolvePreviewControls(controlModules[englishKey]);
    expect(controls?.[0]).toMatchObject({
      kind: 'select',
      label: 'Connection',
      options: expect.arrayContaining([
        { value: 'linear', label: 'Linear' },
        { value: 'step', label: 'Step' },
      ]),
    });
  });

  it('resolves named *Controls exports only', () => {
    const controls = [{ kind: 'input', id: 'size', label: 'Size', defaultValue: '6' }];

    expect(resolvePreviewControls({ lineCurveControls: controls })).toBe(controls);
    expect(resolvePreviewControls({ lineCurveActions: controls })).toBeUndefined();
  });

  it('仅收集 canonical controls，不要求复用方提供转发模块', () => {
    const segments = ['viz', 'grammar', 'mark', 'path'];

    expect(resolvePreviewControls(controlModules[buildControlsKey(segments, 'line-curve')])).toBeDefined();
    expect(controlModules[buildControlsKey(segments, 'line-closure')]).toBeUndefined();
    expect(controlModules[buildLangControlsKey(segments, 'line-closure', 'en')]).toBeUndefined();
    expect(controlModules[buildControlsKey(segments, 'line-stack-area')]).toBeUndefined();
    expect(controlModules[buildLangControlsKey(segments, 'line-stack-area', 'en')]).toBeUndefined();
  });
});
