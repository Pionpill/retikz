import type { ReactNode } from 'react';

import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
} from '../../src/modules/docs/preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as bubbleZh } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.controls';
import { previewControlContract as bubbleEn } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.controls';
import { previewSource as bubbleEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.demo';
import { previewSource as bubbleZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo';
import { previewControlContract as basicZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.controls';
import { previewControlContract as basicEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.controls';
import { previewSource as basicEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.demo';
import { previewSource as basicZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.zh.demo';

const comparable = (contract: PreviewControlContract) => ({
  controls: JSON.parse(
    JSON.stringify(contract.controls, (key, value) =>
      ['title', 'label', 'help', 'customLabel'].includes(key) ? undefined : value,
    ),
  ) as PreviewControlsDefinition,
  canonicalValues: contract.canonicalValues,
  relatedApis: contract.relatedApis,
});

const expectCompletePanel = (contract: PreviewControlContract): void => {
  expect(contract.controls.presentation).toBe('panel');
  if (contract.controls.presentation !== 'panel') return;
  expect(contract.controls.sections[0]?.controls[0]?.kind).toBe('table');
  expect(Object.keys(contract.canonicalValues).sort()).toEqual(
    getPreviewControlFields(contract.controls)
      .map(control => control.id)
      .sort(),
  );
  expect(contract.relatedApis.length).toBeGreaterThan(0);
  expect(contract.relatedApis.every(api => /^(Plot|PointMark|Axis)\./u.test(api))).toBe(true);
};

const canonicalChartSize = (source: PreviewSourceConfig): { width?: number; height?: number } => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ width?: number; height?: number }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return { width: chart.props.width, height: chart.props.height };
};

const canonicalAxisTitles = (source: PreviewSourceConfig): Array<string | undefined> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return Children.toArray(chart.props.children).flatMap(child =>
    isValidElement<{ dimension?: string; title?: string }>(child) && child.props.dimension !== undefined
      ? [child.props.title]
      : [],
  );
};

describe('Viz Chart scatter controls', () => {
  it('保持两组 controls 的双语结构与 canonical 状态一致', () => {
    for (const [zh, en] of [
      [basicZh, basicEn],
      [bubbleZh, bubbleEn],
    ] as const) {
      expect(comparable(zh)).toEqual(comparable(en));
      expectCompletePanel(zh);
      expectCompletePanel(en);
    }
  });

  it('基础 Scatter 只暴露位置不变量与清晰可见的外观变量', () => {
    expect(basicZh.canonicalValues).toEqual({
      pointSize: 10,
      pointOpacity: 0.82,
      colorByGroup: true,
      gridVisible: true,
    });
  });

  it('Bubble 只在两个定量字段尺寸编码之间切换，不提供固定尺寸', () => {
    expect(bubbleZh.canonicalValues).toEqual({ sizeEncoding: 'power', colorByGroup: true });
    expect(JSON.stringify(bubbleZh.controls)).not.toContain('fixed');
    expect(bubbleZh.relatedApis).toContain('PointMark.size');
  });

  it('为 Chart Showcase 使用 800 × 400 的默认图表尺寸', () => {
    for (const source of [basicZhPreviewSource, basicEnPreviewSource, bubbleZhPreviewSource, bubbleEnPreviewSource]) {
      expect(canonicalChartSize(source)).toEqual({ width: 800, height: 400 });
    }
  });

  it('双语 demo 使用本地化轴标题', () => {
    expect(canonicalAxisTitles(basicZhPreviewSource)).toEqual(['重量 (kg)', '效率 (km/L)']);
    expect(canonicalAxisTitles(basicEnPreviewSource)).toEqual(['Weight (kg)', 'Efficiency (km/L)']);
    expect(canonicalAxisTitles(bubbleZhPreviewSource)).toEqual(['重量 (kg)', '效率 (km/L)']);
    expect(canonicalAxisTitles(bubbleEnPreviewSource)).toEqual(['Weight (kg)', 'Efficiency (km/L)']);
  });
});
