import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { scopeClipControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-clip.controls';
import { scopeClipEnControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-clip.en.controls';

const localizedControls: Array<readonly [string, PreviewControlsDefinition]> = [
  ['zh', scopeClipControls],
  ['en', scopeClipEnControls],
];

describe('Scope clip controls', () => {
  it.each(localizedControls)('%s 提供全部内置 clip 类型', (locale, controls) => {
    expect(controls.presentation).toBe('panel');
    if (controls.presentation !== 'panel') throw new Error(`Missing Scope clip panel controls: ${locale}`);

    const fields = controls.sections.flatMap(section => section.controls);
    const clipKind = fields.find(field => field.id === 'clipKind');

    expect(clipKind).toMatchObject({
      kind: 'select',
      defaultValue: 'circle',
    });
    if (!clipKind || clipKind.kind !== 'select') throw new Error(`Missing Scope clip select: ${locale}`);

    expect(clipKind.options.map(option => option.value)).toEqual([
      'rect',
      'circle',
      'ellipse',
      'polygon',
      'path',
      'compound',
    ]);
  });
});
