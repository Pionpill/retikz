import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';
import { createSurface, surfaceProvider } from '@retikz/standard/presentation';
import { describe, expect, it } from 'vitest';

import type { IRTable } from '../../src';
import { createTableRuntimeContribution, TABLE_NAMESPACE, TableComposite } from '../../src';

describe('Standard Surface 里面的 Table', () => {
  it('使用真实的 Table 子项贯通提供者、布局、Scene 和领域产物', () => {
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
          roots: [surfaceProvider.key, ...tableContribution.roots],
          providers: [surfaceProvider, pathClipProvider, ...tableContribution.providers],
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
      expect.arrayContaining([expect.objectContaining({ namespace: 'table', type: 'table' })]),
    );
    expect(result.scene.layout).toEqual({ x: 4, y: 4, width: 120, height: 32 });
  });
});
