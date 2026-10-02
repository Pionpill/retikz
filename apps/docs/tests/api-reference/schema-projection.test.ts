import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { scopeSchemaLocalizations } from '../../scripts/api-reference/scope';
import { createStandardApiReferenceMdx } from '../../scripts/api-reference/standard-schema';
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
import type { SurfaceInput, AxesInput, GridInput, GridLineInput } from '@retikz/standard/presentation';
import type { IRArc, PolygonSchema } from '@retikz/standard/shape';
import type { ArcProps } from '@retikz/standard-react/shape';
import type { InputArc } from '@retikz/standard-vanilla/shape';
import type { IRList, IRListCell } from '@retikz/standard/collection';
import type { input as ZodInput } from 'zod';
type PolygonSource = ZodInput<typeof PolygonSchema>;
export type ArcFields = Pick<IRArc, 'close' | 'startAngle'>;
export type ReactArcFields = Pick<ArcProps, 'close' | 'startAngle'>;
export type VanillaArcFields = Pick<InputArc, 'close' | 'startAngle'>;
export type CustomArc = Omit<IRArc, 'close'> & {
  /** 自定义闭合选项 */
  close?: boolean;
};
export type CellFields = Pick<IRListCell, 'content' | 'id'>;
export type ListFields = Pick<IRList, 'index' | 'cellIdMode'>;
export type SurfaceFields = Pick<SurfaceInput, 'padding' | 'background' | 'overflow'>;
export type AxesFields = Pick<AxesInput, 'x' | 'y' | 'animations' | 'origin'>;
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
          jsx: 'react-jsx',
          target: 'ESNext',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          skipLibCheck: true,
          paths: {
            zod: [path.join(repositoryRoot, 'apps/docs/node_modules/zod/index.d.ts')],
            '@retikz/standard/presentation': [
              path.join(repositoryRoot, 'packages/library/standard/src/presentation/index.ts'),
            ],
            '@retikz/standard/collection': [
              path.join(repositoryRoot, 'packages/library/standard/src/collection/index.ts'),
            ],
            '@retikz/standard-react/shape': [
              path.join(repositoryRoot, 'packages/library/standard-react/src/shape/index.ts'),
            ],
            '@retikz/standard-vanilla/shape': [
              path.join(repositoryRoot, 'packages/library/standard-vanilla/src/shape/index.ts'),
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
      entries: [{ source: entry, title: { zh: 'Schema', en: 'Schema' }, symbols: ['Grid', 'Line', 'IRPolygon'] }],
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
    const standardConfig = {
      ...config,
      schemaLocalizations: undefined,
      entries: [
        {
          ...config.entries[0],
          symbols: [
            'ArcFields',
            'ReactArcFields',
            'VanillaArcFields',
            'CustomArc',
            'SurfaceFields',
            'AxesFields',
            'CellFields',
            'ListFields',
          ],
        },
      ],
    };
    const standardEnglish = await createStandardApiReferenceMdx(standardConfig, 'en');
    expect(standardEnglish.match(/\| `close\?` \|[^\n]+\| `"open"` \| [^—]/g)).toHaveLength(3);
    expect(standardEnglish).toMatch(/\| `padding\?` \|[^\n]+\| `0` \| Uniform or side-specific/);
    expect(standardEnglish).toMatch(/\| `index\?` \|[^\n]+\| `false` \|/);
    expect(standardEnglish).toMatch(/\| `cellIdMode\?` \|[^\n]+\| `'explicit'` \|/);
    expect(standardEnglish).toContain('{"position":[0,0],"label":false}');
    expect(standardEnglish).toContain('Optional fill appearance for the Surface allocation box.');
    expect(standardEnglish).toContain('Horizontal axis configuration and its perpendicular grid projection.');
    const standardChinese = await createStandardApiReferenceMdx(standardConfig, 'zh');
    expect(standardChinese).toContain('水平轴与垂直网格配置');
    expect(standardChinese).toMatch(/\| `close\?` \|[^\n]+\| — \| 自定义闭合选项/);
    expect(standardChinese).toContain('覆盖分配区域的可选填充');
    await expect(
      createApiReferenceMdx({ ...standardConfig, resolveSchemaLocalization: () => undefined }, 'zh'),
    ).rejects.toThrow(/Schema localization/);
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
