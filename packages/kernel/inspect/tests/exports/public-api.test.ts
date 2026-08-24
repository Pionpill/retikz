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
        'RetikzInspectError',
        'RetikzInspectErrorCode',
        'STROKE_PATH_INSPECTOR',
        'InspectionLabelsInputSchema',
        'InspectionLabelsSchema',
      ]),
    );
    expect(api).not.toHaveProperty('RetikzInspectionCompileError');
    expect(api).not.toHaveProperty('inspectionPlaneToReadonlyLayers');
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
    const root = await readFile(new URL('../../src/index.ts', import.meta.url), 'utf8');
    expect(root.trim().split(/\r?\n/)).toEqual([
      "export * from './compile';",
      "export * from './contract';",
      "export * from './error';",
      "export * from './providers';",
      "export * from './schema';",
    ]);
    expect(root).not.toContain('@retikz/render');
    expect(root).not.toContain('@retikz/vanilla');
    await expect(readFile(new URL('../../src/shared/index.ts', import.meta.url), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
