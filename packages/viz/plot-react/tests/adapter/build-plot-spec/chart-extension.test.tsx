import type { ExternalRow } from '@retikz/data';
import { isRetikzError, RetikzError } from '@retikz/foundation';
import type { IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';
import type {
  PlotAuthoringContext,
  PlotComposition,
  PlotDeclarationPath,
  PlotDeclarationSource,
} from '@retikz/plot-vanilla';
import { RetikzPlotVanillaError, RetikzPlotVanillaErrorCode } from '@retikz/plot-vanilla';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { resolvePlotExtensionAuthoring } from '../../../src';
import { PlotAxis, PlotFacet, PlotLegend, PlotScale, PlotTransform, PointMark } from '../../../src/components';
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
  code: RetikzPlotVanillaError['code'],
  path: PlotDeclarationPath,
  conflictingPath?: PlotDeclarationPath,
): void => {
  let thrown: unknown;

  try {
    run();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(RetikzPlotVanillaError);
  expect(thrown).toMatchObject({
    code,
    details: {
      path,
      ...(conflictingPath === undefined ? {} : { conflictingPath }),
    },
  });
};

describe('Plot 图表扩展声明规范化', () => {
  it('保留声明错误契约并无原因地映射细节', () => {
    const path = ['children', 0] as const;
    const conflictingPath = ['props', 'guides'] as const;
    const error = new RetikzPlotVanillaError({
      code: RetikzPlotVanillaErrorCode.DuplicateDeclarationSource,
      message: 'Plot declaration PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE at ["children",0]',
      details: { path, conflictingPath },
    });

    expect(error).toBeInstanceOf(RetikzPlotVanillaError);
    expect(error).toBeInstanceOf(RetikzError);
    expect(isRetikzError(error)).toBe(true);
    expect(error.name).toBe('RetikzPlotVanillaError');
    expect(error.message).toBe('Plot declaration PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE at ["children",0]');
    expect(error.code).toBe(RetikzPlotVanillaErrorCode.DuplicateDeclarationSource);
    expect(error.details).toEqual({ path, conflictingPath });
    expect(error.details.path).toBe(path);
    expect(error.details.conflictingPath).toBe(conflictingPath);
    expect(Object.isFrozen(error.details)).toBe(false);

    const omittedConflict = new RetikzPlotVanillaError({
      code: RetikzPlotVanillaErrorCode.UnsupportedChartChild,
      details: { path },
    });

    expect(omittedConflict.details).toEqual({ path });
    expect(Object.hasOwn(omittedConflict, 'cause')).toBe(true);
    expect(Object.getOwnPropertyNames(omittedConflict)).toContain('cause');
    expect(omittedConflict.cause).toBeUndefined();
  });

  it('仅发出显式 JSON 安全成员并保留其编写顺序', () => {
    const result = normalizeExtension(
      [
        <PlotTransform key="sort" operation={{ kind: 'sort', params: { field: 'amount', order: 'descending' } }} />,
        <PointMark
          key="point"
          id="extension.point"
          encodings={{ position: { x: { field: 'amount' }, y: { field: 'margin' } } }}
        />,
        <PlotScale key="scale" dimension="x" type="log" base={2} />,
        <PlotAxis key="axis" dimension="x" grid />,
        <PlotLegend key="legend" channel="color" title="Series" />,
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
        transform: [{ operation: { kind: 'sort', params: { field: 'amount', order: 'descending' } } }],
        scales: [{ type: 'log', name: '__x', base: 2 }],
        coordinate: { type: 'cartesian2D', x: '__x', y: 'recipe.y' },
        marks: [
          {
            type: 'point',
            id: 'extension.point',
            encodings: { position: { x: { field: 'amount' }, y: { field: 'margin' } } },
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

  it('通过规范绑定规范化传递源感知显式集合和组合', () => {
    const scales: Array<IRPlotScaleOperation> = [{ type: 'linear', name: 'recipe.x' }];
    const guides: Array<IRPlotGuide> = [{ type: 'axis', dimension: 'x' }];
    const composition: PlotComposition = {
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'recipe.x' } }],
    };
    const result = normalizeExtension(
      <PointMark encodings={{ position: { x: { field: 'amount' }, y: { field: 'margin' } } }} />,
      {
        scales: { value: scales, path: ['spec', 'scales'] },
        guides: { value: guides, path: ['spec', 'guides'] },
        composition: { value: composition, path: ['spec', 'composition'] },
      },
    );

    expect(result).toEqual({
      fragment: {
        scales,
        composition,
        marks: [{ type: 'point', encodings: { position: { x: { field: 'amount' }, y: { field: 'margin' } } } }],
        guides,
      },
      runtime: {},
    });
  });

  it('保留 Plot 运行时 sidecar，而不将它们序列化到成员片段中', () => {
    const resolveLabel = (row: ExternalRow): string => String(row.label);
    const result = normalizeExtension(
      <PointMark
        id="labelled"
        resolveLabel={resolveLabel}
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
      />,
    );

    expect(result.fragment).toEqual({
      marks: [{ type: 'point', id: 'labelled', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
    });
    expect(result.runtime).toEqual({ resolveLabel: { labelled: resolveLabel } });
    expect(JSON.stringify(result.fragment)).not.toContain('resolveLabel');
  });

  it('拒绝重复的 JSX 和键入的标记源及其原始路径', () => {
    const marks: PlotDeclarationSource<ReadonlyArray<NonNullable<PlotAuthoringContext['marks']>['value'][number]>> = {
      value: [{ type: 'point', encodings: { position: { x: { field: 'amount' }, y: { field: 'margin' } } } }],
      path: ['props', 'marks'],
    };

    expectDeclarationError(
      () =>
        normalizeExtension(<PointMark encodings={{ position: { x: { field: 'amount' }, y: { field: 'margin' } } }} />, {
          marks,
        }),
      'PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE',
      ['children', 0],
      ['props', 'marks'],
    );
  });

  it.each([
    {
      name: 'raw function child',
      children: (() => 'runtime') as unknown as ReactNode,
      code: 'PLOT_VANILLA_NON_SERIALIZABLE_EXTENSION' as const,
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
            marks: [{ type: 'point', encodings: { position: { x: { value: 0 }, y: { value: 0 } } }, properties: {} }],
          }}
          data={{ nested: [] }}
        />
      ),
      code: 'PLOT_VANILLA_UNSUPPORTED_CHART_CHILD' as const,
      path: ['children', 0] as const,
    },
    {
      name: 'string child',
      children: 'caption',
      code: 'PLOT_VANILLA_UNSUPPORTED_CHART_CHILD' as const,
      path: ['children', 0] as const,
    },
    {
      name: 'number child',
      children: 42,
      code: 'PLOT_VANILLA_UNSUPPORTED_CHART_CHILD' as const,
      path: ['children', 0] as const,
    },
  ])('使用规范代码和原始路径拒绝 $name', ({ children, code, path }) => {
    expectDeclarationError(() => normalizeExtension(children), code, path);
  });

  it('报告第二个嵌套组合声明及其与之冲突的上下文源', () => {
    const children = [
      <PointMark key="point" encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }} />,
      <>
        {null}
        <PlotFacet id="regions" row="region">
          <PointMark encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }} />
        </PlotFacet>
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
      'PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE',
      ['children', 1, 'children', 1],
      ['props', 'composition'],
    );
  });

  it('当上下文已经拥有坐标时拒绝子组合', () => {
    expectDeclarationError(
      () =>
        normalizeExtension(
          <PlotFacet id="regions" row="region">
            <PointMark encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }} />
          </PlotFacet>,
          {
            coordinate: {
              value: { type: 'cartesian2D' },
              path: ['props', 'coordinate'],
            },
          },
        ),
      'PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE',
      ['children', 0],
      ['props', 'coordinate'],
    );
  });

  it('将 JSX 辅助线和缩放报告为上下文集合的第二个来源', () => {
    expectDeclarationError(
      () =>
        normalizeExtension(<PlotAxis dimension="x" />, {
          guides: {
            value: [{ type: 'axis', dimension: 'y' }],
            path: ['spec', 'guides'],
          },
        }),
      'PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE',
      ['children', 0],
      ['spec', 'guides'],
    );

    expectDeclarationError(
      () =>
        normalizeExtension(<PlotScale dimension="x" type="linear" />, {
          scales: {
            value: [{ type: 'linear', name: 'recipe.x' }],
            path: ['props', 'scales'],
          },
        }),
      'PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE',
      ['children', 0],
      ['props', 'scales'],
    );

    expectDeclarationError(
      () =>
        normalizeExtension(<PlotAxis dimension="x" scale="linear" />, {
          scales: {
            value: [{ type: 'linear', name: 'recipe.x' }],
            path: ['spec', 'scales'],
          },
        }),
      'PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE',
      ['children', 0],
      ['spec', 'scales'],
    );
  });
});
