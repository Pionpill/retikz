import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { scopeZIndexControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-z-index.controls';
import { scopeZIndexEnControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-z-index.en.controls';

const localizedControls: Array<readonly [string, PreviewControlsDefinition]> = [
  ['zh', scopeZIndexControls],
  ['en', scopeZIndexEnControls],
];

describe('Scope zIndex controls', () => {
  it.each(localizedControls)('%s 同时控制两个 Scope 与四个 Node 的栈序', (locale, controls) => {
    expect(controls.presentation).toBe('panel');
    if (controls.presentation !== 'panel') throw new Error(`Missing Scope zIndex panel controls: ${locale}`);

    const fields = controls.sections.flatMap(section => section.controls);

    expect(fields.map(field => field.id)).toEqual(['scopeA', 'nodeA1', 'nodeA2', 'scopeB', 'nodeB1', 'nodeB2']);
    expect(fields.map(field => field.defaultValue)).toEqual([1, 0, 0, 0, 0, 0]);
    for (const field of fields) {
      expect(field).toMatchObject({ kind: 'range', min: -2, max: 4, step: 1 });
    }
  });
});
