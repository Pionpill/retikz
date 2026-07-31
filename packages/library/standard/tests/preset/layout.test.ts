import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  createStandardBundle,
  FlexLayoutDefinition,
  FlexLayoutModule,
  GridLayoutDefinition,
  GridLayoutModule,
  OverlayLayoutDefinition,
  OverlayLayoutModule,
  StandardLayoutPreset,
} from '../../src';

const layoutScene: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    createFlexLayout({}),
    createGridLayout({ columns: [{ kind: 'fixed', value: 10 }] }),
    createOverlayLayout({}),
  ],
};

describe('StandardLayoutPreset', () => {
  it('contains the three layout modules once in stable family order', () => {
    expect(StandardLayoutPreset.modules).toEqual([
      'standard.flexLayout',
      'standard.gridLayout',
      'standard.overlayLayout',
    ]);
    expect(StandardLayoutPreset.compile.composites).toEqual([
      FlexLayoutDefinition,
      GridLayoutDefinition,
      OverlayLayoutDefinition,
    ]);
    expect(Object.isFrozen(StandardLayoutPreset)).toBe(true);
  });

  it('keeps direct definitions, modules, custom bundles and the preset equivalent', () => {
    const direct = compileToScene(layoutScene, {
      composites: [FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition],
    });
    const modules = createStandardBundle([FlexLayoutModule, GridLayoutModule, OverlayLayoutModule]);

    expect(compileToScene(layoutScene, modules.compile)).toEqual(direct);
    expect(compileToScene(layoutScene, StandardLayoutPreset.compile)).toEqual(direct);
  });

  it('leaves duplicate family definitions for the Core registry to reject', () => {
    const duplicate = createStandardBundle([
      FlexLayoutModule,
      { name: 'example.duplicateFlexLayout', composites: [FlexLayoutDefinition] },
    ]);

    expect(() => compileToScene(layoutScene, duplicate.compile)).toThrow(
      /duplicate composite registration.*standard\.flexLayout/i,
    );
  });

  it('does not globally register layout capabilities when imported', () => {
    const warnings: Array<string> = [];

    compileToScene(layoutScene, { onWarn: warning => warnings.push(warning.code) });

    expect(warnings).toEqual(['COMPOSITE_NOT_REGISTERED', 'COMPOSITE_NOT_REGISTERED', 'COMPOSITE_NOT_REGISTERED']);
  });
});
