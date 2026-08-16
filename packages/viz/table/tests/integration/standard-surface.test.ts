import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { createSurface, SurfaceProvider } from '@retikz/standard';
import { PathClipProvider } from '@retikz/standard/clip';
import { describe, expect, it } from 'vitest';

import type { IRTable } from '../../src';

import { createTableRuntimeContribution, TABLE_NAMESPACE, TableComposite } from '../../src';

describe('Table inside Standard Surface', () => {
  it('closes provider, layout, Scene, artifact, and Surface spatial output with a real Table child', () => {
    const table: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'people',
      structure: { kind: 'manual', rows: [['Ada']] },
    };
    const tableContribution = createTableRuntimeContribution({ reference: 'surface-table' });
    const providerDefinitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [SurfaceProvider.key, ...tableContribution.roots],
          providers: [SurfaceProvider, PathClipProvider, ...tableContribution.providers],
        },
      ],
    });
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'table-panel',
      padding: 4,
      child: table,
    });

    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      { ...providerDefinitions, padding: 0 },
    );

    expect(providerDefinitions.composites?.map(definition => `${definition.namespace}.${definition.type}`)).toEqual([
      'standard.surface',
      'table.table',
    ]);
    expect(JSON.stringify(result.scene.primitives)).toContain('Ada');
    expect(result.artifacts).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'composite', namespace: 'table', type: 'table' })]),
    );
    expect(result.spatialHandles.entries).toEqual([
      expect.objectContaining({
        ownerPath: [expect.objectContaining({ namespace: 'standard', type: 'surface', instanceId: 'table-panel' })],
        key: 'surface',
        role: 'surface',
        geometry: { kind: 'rect', bounds: { x: 0, y: 0, width: 128, height: 40 } },
      }),
    ]);
  });
});
