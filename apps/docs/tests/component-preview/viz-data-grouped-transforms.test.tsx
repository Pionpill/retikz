import { createElement } from 'react';
import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Lang } from '../../src/i18n';
import type { PreviewControlContract, PreviewControlValues } from '../../src/modules/docs/components/component-preview';
import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { PreviewThemeProvider } from '../../src/modules/docs/components/component-preview/theme';
import AnnotateDemo from '../../src/modules/docs/contents/viz/data/transforms/aggregation-annotation/group-annotate';
import { createPreviewControlContract as createAnnotateContract } from '../../src/modules/docs/contents/viz/data/transforms/aggregation-annotation/group-annotate.controls';
import SummarizeDemo from '../../src/modules/docs/contents/viz/data/transforms/aggregation-annotation/group-summarize';
import { createPreviewControlContract as createSummarizeContract } from '../../src/modules/docs/contents/viz/data/transforms/aggregation-annotation/group-summarize.controls';
import BinDemo from '../../src/modules/docs/contents/viz/data/transforms/bin-density/distribution-bin';
import { createPreviewControlContract as createBinContract } from '../../src/modules/docs/contents/viz/data/transforms/bin-density/distribution-bin.controls';
import DensityDemo from '../../src/modules/docs/contents/viz/data/transforms/bin-density/distribution-density';
import { createPreviewControlContract as createDensityContract } from '../../src/modules/docs/contents/viz/data/transforms/bin-density/distribution-density.controls';
import IntervalDemo from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-interval';
import { createPreviewControlContract as createIntervalContract } from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-interval.controls';
import JitterDemo from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-jitter';
import { createPreviewControlContract as createJitterContract } from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-jitter.controls';
import NormalizeDemo from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-normalize';
import { createPreviewControlContract as createNormalizeContract } from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-normalize.controls';
import StackDemo from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-stack';
import { createPreviewControlContract as createStackContract } from '../../src/modules/docs/contents/viz/data/transforms/numeric-derivation/numeric-stack.controls';
import RelateDemo from '../../src/modules/docs/contents/viz/data/transforms/relation-generation/relation-relate';
import { createPreviewControlContract as createRelateContract } from '../../src/modules/docs/contents/viz/data/transforms/relation-generation/relation-relate.controls';
import SmoothDemo from '../../src/modules/docs/contents/viz/data/transforms/trend-sampling/trend-smooth';
import { createPreviewControlContract as createSmoothContract } from '../../src/modules/docs/contents/viz/data/transforms/trend-sampling/trend-smooth.controls';

/** 比较语言无关的控件状态，不锁定本地化文案 */
const comparableContract = (contract: PreviewControlContract): string =>
  JSON.stringify(contract, (key, value) => (['label', 'title', 'help'].includes(key) ? undefined : value));
/** 通过真实预览入口渲染当前状态 */
const renderDemo = (
  Demo: FC<{ lang?: Lang }>,
  contract: PreviewControlContract,
  values: PreviewControlValues,
  lang: Lang,
): string =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: contract.canonicalValues,
          values: { ...contract.canonicalValues, ...values },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(PreviewThemeProvider, null, createElement(Demo, { lang })),
    ),
  );

describe('Grouped Data transform documentation demos', () => {
  const demos: Array<{
    name: string;
    Demo: FC<{ lang?: Lang }>;
    contractOf: (lang?: Lang) => PreviewControlContract;
    values: PreviewControlValues;
    field: string;
  }> = [
    {
      name: 'group-summarize',
      Demo: SummarizeDemo,
      contractOf: createSummarizeContract,
      values: { group: 'team-item' },
      field: 'stat',
    },
    {
      name: 'group-annotate',
      Demo: AnnotateDemo,
      contractOf: createAnnotateContract,
      values: { mode: 'selector' },
      field: 'peak',
    },
    {
      name: 'numeric-stack',
      Demo: StackDemo,
      contractOf: createStackContract,
      values: { offset: 'diverging' },
      field: 'y0',
    },
    {
      name: 'numeric-normalize',
      Demo: NormalizeDemo,
      contractOf: createNormalizeContract,
      values: { overwrite: true },
      field: 'value',
    },
    {
      name: 'numeric-interval',
      Demo: IntervalDemo,
      contractOf: createIntervalContract,
      values: { mode: 'fields' },
      field: 'y1',
    },
    { name: 'numeric-jitter', Demo: JitterDemo, contractOf: createJitterContract, values: { amount: 0 }, field: 'x' },
    {
      name: 'distribution-bin',
      Demo: BinDemo,
      contractOf: createBinContract,
      values: { grouped: true, count: 4 },
      field: 'binCount',
    },
    {
      name: 'distribution-density',
      Demo: DensityDemo,
      contractOf: createDensityContract,
      values: { grouped: true, samples: 6, bandwidth: 'value', width: 2 },
      field: 'density',
    },
    {
      name: 'trend-smooth',
      Demo: SmoothDemo,
      contractOf: createSmoothContract,
      values: { grouped: true, samples: 6, method: 'quadratic', extended: true },
      field: 'trendY',
    },
    {
      name: 'relation-relate',
      Demo: RelateDemo,
      contractOf: createRelateContract,
      values: { measure: false, pair: 'ends' },
      field: 'sourceId',
    },
  ];
  it.each(demos)('$name has a complete bilingual Reset baseline', ({ contractOf }) => {
    const zh = contractOf('zh');
    expect(comparableContract(zh)).toBe(comparableContract(contractOf('en')));
    expect(Object.keys(zh.canonicalValues).sort()).toEqual(
      getPreviewControlFields(zh.controls)
        .map(field => field.id)
        .sort(),
    );
  });
  it.each(demos)(
    '$name renders its result table through the actual controlled entry',
    ({ Demo, contractOf, values, field }) => {
      for (const lang of ['zh', 'en'] as const) {
        const contract = contractOf(lang);
        const baseline = renderDemo(Demo, contract, {}, lang);
        const changed = renderDemo(Demo, contract, values, lang);
        expect(baseline).toContain('data-retikz-id="source"');
        expect(changed).toContain('data-retikz-id="result"');
        expect(changed).toContain(`>${field}</tspan>`);
        expect(changed).toContain(lang === 'zh' ? '变换结果' : 'Transformed rows');
        // 比较可见文本，排除每次渲染生成的 marker id
        const textOf = (svg: string): string =>
          [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(match => match[1]).join('|');
        expect(textOf(changed)).not.toBe(textOf(baseline));
      }
    },
  );
});
