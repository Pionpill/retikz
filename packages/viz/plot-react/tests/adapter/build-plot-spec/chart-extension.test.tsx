import type { ExternalRow } from '@retikz/data';
import type { IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';
import type {
  PlotAuthoringContext,
  PlotComposition,
  PlotDeclarationPath,
  PlotDeclarationSource,
} from '@retikz/plot-vanilla';
import type { ReactNode } from 'react';

import { isRetikzError, RetikzError } from '@retikz/foundation';
import { RetikzPlotDeclarationError } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { resolvePlotExtensionAuthoring } from '../../../src';
import { Axis, Facet, Legend, PointMark, Scale, Transform } from '../../../src/components';
import { Plot } from '../../../src/Plot';

const extensionContext = (overrides: Partial<PlotAuthoringContext> = {}): PlotAuthoringContext => ({
  data: { reference: 'rows' },
  mode: 'chart-extension',
  ...overrides,
});

const normalizeExtension = (
  children: ReactNode,
  overrides: Partial<PlotAuthoringContext> = {},
): ReturnType<typeof resolvePlotExtensionAuthoring> =>
  resolvePlotExtensionAuthoring(children, extensionContext(overrides));

const expectDeclarationError = (
  run: () => unknown,
  code: RetikzPlotDeclarationError['code'],
  path: PlotDeclarationPath,
  conflictingPath?: PlotDeclarationPath,
): void => {
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(RetikzPlotDeclarationError);
  expect(thrown).toMatchObject({
    code,
    path,
    ...(conflictingPath === undefined ? {} : { conflictingPath }),
  });
};

describe('Plot chart-extension declaration normalization', () => {
  it('preserves the declaration error contract and maps details without a cause', () => {
    const path = ['children', 0] as const;
    const conflictingPath = ['props', 'guides'] as const;
    const error = new RetikzPlotDeclarationError('duplicate-declaration-source', path, conflictingPath);

    expect(error).toBeInstanceOf(RetikzPlotDeclarationError);
    expect(error).toBeInstanceOf(RetikzError);
    expect(isRetikzError(error)).toBe(true);
    expect(error.name).toBe('RetikzPlotDeclarationError');
    expect(error.message).toBe('Plot declaration duplicate-declaration-source at ["children",0]');
    expect(error.code).toBe('duplicate-declaration-source');
    expect(error.path).toBe(path);
    expect(error.conflictingPath).toBe(conflictingPath);
    expect(error.details).toEqual({ path, conflictingPath });
    expect(error.details.path).toBe(path);
    expect(error.details.conflictingPath).toBe(conflictingPath);
    expect(Object.isFrozen(error.details)).toBe(false);

    const omittedConflict = new RetikzPlotDeclarationError('unsupported-chart-child', path);
    expect(omittedConflict.details).toEqual({ path });
    expect(Object.hasOwn(omittedConflict, 'cause')).toBe(true);
    expect(Object.getOwnPropertyNames(omittedConflict)).toContain('cause');
    expect(omittedConflict.cause).toBeUndefined();
  });

  it('emits only explicit JSON-safe members and preserves their authored order', () => {
    const result = normalizeExtension(
      [
        <Transform key="sort" kind="sort" field="amount" order="descending" />,
        <PointMark key="point" id="extension.point" x="amount" y="margin" />,
        <Scale key="scale" dimension="x" type="log" base={2} />,
        <Axis key="axis" dimension="x" grid />,
        <Legend key="legend" channel="color" title="Series" />,
      ],
      {
        coordinate: {
          value: { type: 'cartesian2D', x: '__x', y: 'recipe.y' },
          path: ['props', 'coordinate'],
        },
      },
    );

    expect(result).toEqual({
      fragment: {
        transform: [{ kind: 'sort', field: 'amount', order: 'descending' }],
        scales: [{ type: 'log', name: '__x', base: 2 }],
        coordinate: { type: 'cartesian2D', x: '__x', y: 'recipe.y' },
        marks: [
          {
            type: 'point',
            id: 'extension.point',
            encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
          },
        ],
        guides: [
          { type: 'axis', dimension: 'x', grid: true },
          { type: 'legend', channel: 'color', title: 'Series' },
        ],
      },
      runtime: {},
    });
    expect(JSON.stringify(result.fragment)).not.toContain('rows');
  });

  it('passes source-aware explicit collections and composition through canonical binding normalization', () => {
    const scales: Array<IRPlotScaleOperation> = [{ type: 'linear', name: 'recipe.x' }];
    const guides: Array<IRPlotGuide> = [{ type: 'axis', dimension: 'x' }];
    const composition: PlotComposition = {
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'recipe.x' } }],
    };
    const result = normalizeExtension(<PointMark x="amount" y="margin" />, {
      scales: { value: scales, path: ['spec', 'scales'] },
      guides: { value: guides, path: ['spec', 'guides'] },
      composition: { value: composition, path: ['spec', 'composition'] },
    });

    expect(result).toEqual({
      fragment: {
        scales,
        composition,
        marks: [{ type: 'point', encoding: { x: { field: 'amount' }, y: { field: 'margin' } } }],
        guides,
      },
      runtime: {},
    });
  });

  it('preserves Plot runtime sidecars without serializing them into the member fragment', () => {
    const resolveLabel = (row: ExternalRow): string => String(row.label);
    const result = normalizeExtension(<PointMark id="labelled" x="x" y="y" resolveLabel={resolveLabel} />);

    expect(result.fragment).toEqual({
      marks: [{ type: 'point', id: 'labelled', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });
    expect(result.runtime).toEqual({ resolveLabel: { labelled: resolveLabel } });
    expect(JSON.stringify(result.fragment)).not.toContain('resolveLabel');
  });

  it('rejects duplicate JSX and typed mark sources with their original paths', () => {
    const marks: PlotDeclarationSource<ReadonlyArray<NonNullable<PlotAuthoringContext['marks']>['value'][number]>> = {
      value: [{ type: 'point', encoding: { x: { field: 'amount' }, y: { field: 'margin' } } }],
      path: ['props', 'marks'],
    };

    expectDeclarationError(
      () => normalizeExtension(<PointMark x="amount" y="margin" />, { marks }),
      'duplicate-declaration-source',
      ['children', 0],
      ['props', 'marks'],
    );
  });

  it.each([
    {
      name: 'raw function child',
      children: (() => 'runtime') as unknown as ReactNode,
      code: 'non-serializable-extension' as const,
      path: ['children', 0] as const,
    },
    {
      name: 'nested Plot',
      children: (
        <Plot
          spec={{
            namespace: 'plot',
            type: 'plot',
            data: { reference: 'nested' },
            scales: [],
            marks: [{ type: 'point', encoding: { x: { value: 0 }, y: { value: 0 } } }],
          }}
          data={{ nested: [] }}
        />
      ),
      code: 'unsupported-chart-child' as const,
      path: ['children', 0] as const,
    },
    {
      name: 'string child',
      children: 'caption',
      code: 'unsupported-chart-child' as const,
      path: ['children', 0] as const,
    },
    {
      name: 'number child',
      children: 42,
      code: 'unsupported-chart-child' as const,
      path: ['children', 0] as const,
    },
  ])('rejects $name with a canonical code and raw path', ({ children, code, path }) => {
    expectDeclarationError(() => normalizeExtension(children), code, path);
  });

  it('reports the second nested composition declaration and the context source it conflicts with', () => {
    const children = [
      <PointMark key="point" x="x" y="y" />,
      <>
        {null}
        <Facet id="regions" row="region">
          <PointMark x="x" y="y" />
        </Facet>
      </>,
    ];

    expectDeclarationError(
      () =>
        normalizeExtension(children, {
          composition: {
            value: {
              defaultView: 'main',
              views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
            },
            path: ['props', 'composition'],
          },
        }),
      'duplicate-declaration-source',
      ['children', 1, 'children', 1],
      ['props', 'composition'],
    );
  });

  it('reports JSX guides and scales as second sources of context collections', () => {
    expectDeclarationError(
      () =>
        normalizeExtension(<Axis dimension="x" />, {
          guides: {
            value: [{ type: 'axis', dimension: 'y' }],
            path: ['spec', 'guides'],
          },
        }),
      'duplicate-declaration-source',
      ['children', 0],
      ['spec', 'guides'],
    );

    expectDeclarationError(
      () =>
        normalizeExtension(<Scale dimension="x" type="linear" />, {
          scales: {
            value: [{ type: 'linear', name: 'recipe.x' }],
            path: ['props', 'scales'],
          },
        }),
      'duplicate-declaration-source',
      ['children', 0],
      ['props', 'scales'],
    );

    expectDeclarationError(
      () =>
        normalizeExtension(<Axis dimension="x" scale="linear" />, {
          scales: {
            value: [{ type: 'linear', name: 'recipe.x' }],
            path: ['spec', 'scales'],
          },
        }),
      'duplicate-declaration-source',
      ['children', 0],
      ['spec', 'scales'],
    );
  });
});
