import type { ReactNode } from 'react';

import { ConnectedScatterEncodings } from '@retikz/chart-react/point';
import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { PreviewSourceConfig } from '../../src/modules/docs/preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as connectedZh } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.controls';
import { previewControlContract as connectedEn } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.controls';
import { previewSource as connectedEnSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.demo';
import { previewSource as connectedZhSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.zh.demo';

const canonicalDeclarationProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Connected Scatter preview must provide a canonical element');
  }
  const declaration = Children.toArray(chart.props.children).find(
    child => isValidElement(child) && child.type === ConnectedScatterEncodings,
  );
  if (!isValidElement<Record<string, unknown>>(declaration)) {
    throw new Error('Connected Scatter preview is missing its encoding declaration');
  }
  return declaration.props;
};

describe('Viz Chart Connected Scatter controls', () => {
  it('将可用的 country 字段作为可开关的 series encoding 暴露出来', () => {
    for (const contract of [connectedZh, connectedEn]) {
      expect(contract.canonicalValues).toMatchObject({
        'connected-scatter-series-by-country': true,
      });
      expect(getPreviewControlFields(contract.controls).map(control => control.id)).toContain(
        'connected-scatter-series-by-country',
      );
      expect(contract.relatedApis).toContain('ConnectedScatterEncodings.series');
    }

    for (const source of [connectedZhSource, connectedEnSource]) {
      expect(canonicalDeclarationProps(source)).toMatchObject({
        x: 'urbanization',
        y: 'lifeExpectancy',
        order: 'year',
        series: 'country',
      });
    }
  });
});
