import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';

import * as api from '../../src';

describe('@retikz/inspect public exports', () => {
  it('exports the host-independent root API', () => {
    expect(Object.keys(api)).toEqual(
      expect.arrayContaining([
        'defineInspector',
        'createInspectorRegistry',
        'createDefaultInspectorRegistry',
        'resolveInspectionSelection',
        'compileInspectionToScene',
        'STROKE_PATH_INSPECTOR',
      ]),
    );
    expect(api).not.toHaveProperty('inspectionPlaneToReadonlyLayers');
  });

  it('does not evaluate optional host peers from the root entry', async () => {
    vi.resetModules();
    vi.doMock('@retikz/render/runtime', () => {
      throw new Error('optional Render peer evaluated');
    });
    vi.doMock('@retikz/vanilla', () => {
      throw new Error('optional Vanilla peer evaluated');
    });
    await expect(import('../../src/index')).resolves.toBeDefined();
    const root = await readFile(new URL('../../src/index.ts', import.meta.url), 'utf8');
    expect(root).not.toContain('@retikz/render');
    expect(root).not.toContain('@retikz/vanilla');
  });
});
