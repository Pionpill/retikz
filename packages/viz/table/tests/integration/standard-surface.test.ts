import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';
import { createSurface, SurfaceProvider } from '@retikz/standard/presentation';
import { describe, expect, it } from 'vitest';

import type { IRTable } from '../../src';
import { createTableRuntimeContribution, TABLE_NAMESPACE, TableComposite } from '../../src';

describe('Standard Surface 里面的 Table', () => {
  it('使用真实的 Table 子项关闭提供者、布局、Scene、产物和 Surface 空间输出', () => {
    const table: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      id: 'people',
      structure: { kind: 'manual', rows: [['Ada']] },
    };
    const tableContribution = createTableRuntimeContribution({});
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
        id: 'surface',
        role: 'surface',
        geometry: { kind: 'rect', bounds: { x: 0, y: 0, width: 128, height: 40 } },
      }),
    ]);
  });
});
