import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { scopeSchemaLocalizations } from '../../scripts/api-reference/scope';
import { createApiReferenceMdx } from '../../scripts/api-reference/tex';
import {
  GridLineSchemaZhLocalization,
  GridSchemaZhLocalization,
} from '../../src/modules/docs/components/mdx-content/zod-schema/standard-presentation-localizations';

it('跨包继承读取真实 Schema 描述和默认值，联合分支使用相同投影且不虚构默认值', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'retikz-schema-reference-'));
  const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
  try {
    const entry = path.join(directory, 'index.ts');
    const tsconfigPath = path.join(directory, 'tsconfig.json');
    writeFileSync(
      entry,
      `
import type { GridInput, GridLineInput } from '@retikz/standard/presentation';
import type { PolygonSchema } from '@retikz/standard/shape';
import type { input as ZodInput } from 'zod';
type PolygonSource = ZodInput<typeof PolygonSchema>;
export type Grid = Pick<GridInput, 'line' | 'localNamespace' | 'bounds'>;
export type Line = Pick<GridLineInput, 'spacing' | 'includeBoundary' | 'origin'>;
export type IRPolygon = (Pick<Extract<PolygonSource, { radius: number }>, 'radius' | 'sides'>
  | Pick<Extract<PolygonSource, { sideLength: number }>, 'sideLength' | 'sides'>)
  & Pick<GridLineInput, 'spacing'>;
`,
      'utf8',
    );
    writeFileSync(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          target: 'ESNext',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          skipLibCheck: true,
          paths: {
            zod: [path.join(repositoryRoot, 'apps/docs/node_modules/zod/index.d.ts')],
            '@retikz/standard/presentation': [
              path.join(repositoryRoot, 'packages/library/standard/src/presentation/index.ts'),
            ],
            '@retikz/standard/shape': [path.join(repositoryRoot, 'packages/library/standard/src/shape/index.ts')],
          },
        },
        files: [entry],
      }),
      'utf8',
    );
    const config = {
      packageName: '@retikz/standard/shape',
      packageDirectory: directory,
      tsconfigPath,
      entries: [{ source: entry, title: { zh: 'Schema', en: 'Schema' } }],
      translate: (text: string) => text,
      schemaLocalizations: {
        GridSchema: GridSchemaZhLocalization,
        GridLineInputSchema: GridLineSchemaZhLocalization,
        ScopePropsSchema: {
          descriptions: Object.fromEntries(
            Object.entries(scopeSchemaLocalizations.ScopeSchema.descriptions).filter(
              ([key]) => key !== 'type' && key !== 'children',
            ),
          ),
        },
        PolygonSchema: { descriptions: { radius: '外接半径', sideLength: '正多边形边长', sides: '至少三条边' } },
      },
    };
    const english = await createApiReferenceMdx(config, 'en');
    expect(english).toContain('| `line?`');
    expect(english).toContain('| `true` | Disabled, shared, or direction-specific grid-line configuration. |');
    expect(english).toContain('When true, child node, coordinate, and nested-scope ids stay local to this scope.');
    expect(english).toContain(
      '| `spacing?` | `number` | `10` | Positive distance between adjacent grid lines in this direction. |',
    );
    expect(english).toContain(
      '| `includeBoundary?` | `false \\| true` | `false` | Whether missing bounds edges are added as grid lines. |',
    );
    expect(english).toContain('| `sideLength` | `number` | — | Regular polygon side length. |');
    expect(english.match(/Number of polygon sides; at least three\./g)).toHaveLength(2);
    expect(english.match(/\| `spacing\?` \| `number` \| `10`/g)).toHaveLength(3);
    const chinese = await createApiReferenceMdx(config, 'zh');
    expect(chinese).toContain('| `sideLength` | `number` | — | 正多边形边长 |');
    expect(chinese).toContain('| `spacing?` | `number` | `10` | 相邻格线的正间距 |');
    await expect(
      createApiReferenceMdx(
        {
          ...config,
          entries: [{ ...config.entries[0], symbols: ['IRPolygon'] }],
          schemaLocalizations: {
            ...config.schemaLocalizations,
            PolygonSchema: { descriptions: { radius: '外接半径', sideLength: '正多边形边长' } },
          },
        },
        'zh',
      ),
    ).rejects.toThrow(/missing sides/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 120_000);
