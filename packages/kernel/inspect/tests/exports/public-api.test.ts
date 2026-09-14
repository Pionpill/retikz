import { describe, expect, it, vi } from 'vitest';

import manifest from '../../package.json';
import * as api from '../../src';
import * as reactApi from '../../src/react';
import * as vanillaApi from '../../src/vanilla';

describe('@retikz/inspect public exports', () => {
  it('exposes only the root and host entry points in development and publication', () => {
    expect(Object.keys(manifest.exports).sort()).toEqual(['.', './react', './vanilla']);
    expect(Object.keys(manifest.publishConfig.exports).sort()).toEqual(['.', './react', './vanilla']);
    expect(manifest.exports).not.toHaveProperty('./compile');
    expect(manifest.publishConfig.exports).not.toHaveProperty('./compile');
  });

  it('exports the host-independent root API', () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        'defineInspector',
        'createInspectorRegistry',
        'createDefaultInspectorRegistry',
        'mergeInspectorRegistries',
        'compileInspectionToScene',
        'RetikzInspectError',
        'RetikzInspectErrorCode',
        'NODE_INSPECTOR_KEY',
        'CLIP_INSPECTOR_KEY',
        'SCOPE_INSPECTOR_KEY',
        'COORDINATE_INSPECTOR_KEY',
        'PathInspectOptionsSchema',
        'NodeInspectOptionsSchema',
        'ClipInspectOptionsSchema',
        'ScopeInspectOptionsSchema',
        'CoordinateInspectOptionsSchema',
        'PATH_INSPECTOR_KEY',
      ].sort(),
    );
    expect(Object.keys(reactApi).sort()).toEqual([
      'InspectCoordinate',
      'InspectLayout',
      'InspectNode',
      'InspectPath',
      'InspectScope',
    ]);
    expect(Object.keys(vanillaApi).sort()).toEqual([
      'createInspectionVanillaAuthoring',
      'createInspectionVanillaDriver',
    ]);
    expect(api).not.toHaveProperty('admitInspectionSelection');
    expect(api).not.toHaveProperty('resolveAdmittedInspectionSelection');
    expect(api).not.toHaveProperty('canInspectionSelectionRequestSite');
  });

  it('does not evaluate optional host peers from the root entry', async () => {
    vi.resetModules();
    vi.doMock('@retikz/render/runtime', () => {
      throw new Error('optional Render peer evaluated');
    });
    vi.doMock('@retikz/react', () => {
      throw new Error('optional React peer evaluated');
    });
    vi.doMock('@retikz/vanilla', () => {
      throw new Error('optional Vanilla peer evaluated');
    });
    vi.doMock('react', () => {
      throw new Error('optional React runtime evaluated');
    });
    await expect(import('../../src/index')).resolves.toBeDefined();
  });
});
