import type { ReactNode } from 'react';

import { ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RegressionEncodings, RegressionProperties } from '@retikz/chart-react/point/regression';
import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
} from '../../src/modules/docs/preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';

type IrisRegressionDatum = Readonly<{
  sepalLengthCm: number;
  petalLengthCm: number;
  species: 'setosa' | 'versicolor' | 'virginica';
}>;

type DataModule = Readonly<{
  IRIS_REGRESSION_LICENSE: string;
  IRIS_REGRESSION_SOURCE_DOI: string;
  IRIS_REGRESSION_SOURCE_URL: string;
  irisRegressionData: Array<IrisRegressionDatum>;
}>;

type ControlsModule = Readonly<{
  previewControlContract: PreviewControlContract;
}>;

type DemoModule = Readonly<{
  previewSource: PreviewSourceConfig;
}>;

const dataModules = import.meta.glob<DataModule>(
  '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.data.ts',
  { eager: true },
);
const controlsModules = import.meta.glob<ControlsModule>(
  '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic*.controls.ts',
  { eager: true },
);
const demoModules = import.meta.glob<DemoModule>(
  '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.*.demo.tsx',
  { eager: true },
);

const modulePath = (suffix: string): string =>
  `../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.${suffix}`;

const requiredModule = <T>(modules: Record<string, T | undefined>, path: string): T => {
  const module = modules[path];
  expect(module, path).toBeDefined();
  return module as T;
};

const comparable = (contract: PreviewControlContract) => ({
  controls: JSON.parse(
    JSON.stringify(contract.controls, (key, value) =>
      ['title', 'label', 'help', 'customLabel'].includes(key) ? undefined : value,
    ),
  ) as PreviewControlsDefinition,
  canonicalValues: contract.canonicalValues,
  relatedApis: contract.relatedApis,
});

const canonicalDeclarationProps = <TProps extends object = Record<string, unknown>>(
  source: PreviewSourceConfig,
  component: unknown,
): TProps => {
  const chart = source.canonicalRender?.();
  expect(isValidElement<{ children?: ReactNode }>(chart), 'canonical Regression element').toBe(true);
  const declaration = Children.toArray((chart as { props: { children?: ReactNode } }).props.children).find(
    child => isValidElement(child) && child.type === component,
  );
  expect(isValidElement<TProps>(declaration), `Regression declaration ${String(component)}`).toBe(true);
  return (declaration as { props: TProps }).props;
};

const canonicalPresentation = (source: PreviewSourceConfig): Record<'title' | 'subtitle' | 'source', ReactNode> => {
  const chart = source.canonicalRender?.();
  expect(isValidElement<{ children?: ReactNode }>(chart), 'canonical Regression element').toBe(true);
  const children = Children.toArray((chart as { props: { children?: ReactNode } }).props.children);
  const textOf = (marker: typeof ChartTitle | typeof ChartSubtitle | typeof ChartSource): ReactNode => {
    const child = children.find(candidate => isValidElement(candidate) && candidate.type === marker);
    expect(isValidElement<{ children?: ReactNode }>(child), `Regression presentation ${marker.displayName}`).toBe(true);
    return (child as { props: { children?: ReactNode } }).props.children;
  };
  return {
    title: textOf(ChartTitle),
    subtitle: textOf(ChartSubtitle),
    source: textOf(ChartSource),
  };
};

describe('Viz Chart Regression controls', () => {
  it('保留可追溯且未筛行的 UCI Iris 150 行静态快照', () => {
    const data = requiredModule(dataModules, modulePath('data.ts'));

    expect(data.IRIS_REGRESSION_SOURCE_DOI).toBe('10.24432/C56C76');
    expect(data.IRIS_REGRESSION_SOURCE_URL).toContain('archive.ics.uci.edu');
    expect(data.IRIS_REGRESSION_LICENSE).toBe('CC BY 4.0');
    expect(data.irisRegressionData).toHaveLength(150);
    expect(new Set(data.irisRegressionData.map(datum => datum.species))).toEqual(
      new Set(['setosa', 'versicolor', 'virginica']),
    );
    expect(
      data.irisRegressionData.every(
        datum => datum.sepalLengthCm > 0 && datum.petalLengthCm > 0 && datum.species.length > 0,
      ),
    ).toBe(true);
  });

  it('双语 controls 保持六种方法、条件阶数与稳定 canonical 状态', () => {
    const zh = requiredModule(controlsModules, modulePath('controls.ts')).previewControlContract;
    const en = requiredModule(controlsModules, modulePath('en.controls.ts')).previewControlContract;

    expect(comparable(zh)).toEqual(comparable(en));
    expect(zh.canonicalValues).toEqual({
      'regression-basic-group-by-species': true,
      'regression-basic-method': 'linear',
      'regression-basic-order': 3,
      'regression-basic-sample-count': 64,
      'regression-basic-point-opacity': 0.55,
      'regression-basic-trend-stroke-width': 2,
    });

    const fields = getPreviewControlFields(zh.controls);
    expect(fields.map(field => field.id)).toEqual([
      'regression-basic-group-by-species',
      'regression-basic-method',
      'regression-basic-order',
      'regression-basic-sample-count',
      'regression-basic-point-opacity',
      'regression-basic-trend-stroke-width',
    ]);

    const method = fields.find(field => field.id === 'regression-basic-method');
    expect(method).toMatchObject({ kind: 'select', defaultValue: 'linear' });
    if (method?.kind === 'select') {
      expect(method.options.map(option => option.value)).toEqual([
        'linear',
        'quadratic',
        'polynomial',
        'logarithmic',
        'exponential',
        'power',
      ]);
    }

    expect(fields.find(field => field.id === 'regression-basic-order')).toMatchObject({
      kind: 'range',
      defaultValue: 3,
      min: 2,
      max: 6,
      step: 1,
      visibleWhen: { controlId: 'regression-basic-method', oneOf: ['polynomial'] },
    });
    expect(fields.find(field => field.id === 'regression-basic-sample-count')).toMatchObject({
      kind: 'range',
      defaultValue: 64,
      min: 16,
      max: 128,
    });
    expect(Object.keys(zh.canonicalValues).sort()).toEqual(fields.map(field => field.id).sort());
    expect(zh.relatedApis).toEqual([
      'RegressionEncodings.series',
      'RegressionProperties.method',
      'RegressionProperties.sampleCount',
      'RegressionProperties.point.opacity',
      'RegressionProperties.trend.strokeWidth',
    ]);
  });

  it('双语 demo 从 canonical controls 派生精简 Regression Source', () => {
    for (const suffix of ['zh.demo.tsx', 'en.demo.tsx']) {
      const source = requiredModule(demoModules, modulePath(suffix)).previewSource;

      expect(canonicalDeclarationProps(source, RegressionEncodings)).toEqual({
        x: 'sepalLengthCm',
        y: 'petalLengthCm',
        series: 'species',
      });
      expect(canonicalDeclarationProps(source, RegressionProperties)).toEqual({
        method: { kind: 'linear' },
        sampleCount: 64,
        point: { opacity: 0.55 },
        trend: { strokeWidth: 2 },
      });
      expect(canonicalDeclarationProps(source, ChartLayout)).toMatchObject({ width: 800, height: 500 });
      expect(source.datasetImports).toEqual({
        'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' },
      });
    }
  });

  it('双语 demo 在 Chart presentation 中说明变量、分组与可追溯来源', () => {
    const zh = canonicalPresentation(requiredModule(demoModules, modulePath('zh.demo.tsx')).previewSource);
    const en = canonicalPresentation(requiredModule(demoModules, modulePath('en.demo.tsx')).previewSource);

    expect(zh).toMatchObject({
      title: expect.stringContaining('鸢尾花'),
      subtitle: expect.stringContaining('厘米'),
      source: expect.stringContaining('10.24432/C56C76'),
    });
    expect(en).toMatchObject({
      title: expect.stringContaining('Iris'),
      subtitle: expect.stringContaining('centimetres'),
      source: expect.stringContaining('10.24432/C56C76'),
    });
  });
});
