import { ConnectedScatterEncodings } from '@retikz/chart-react/point';
import type { ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import {
  createPreviewControlContract,
  previewSource,
} from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-encodings';
import type { PreviewSourceConfig } from '../../src/modules/docs/preview';

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
  it('固定按 country 分组，不暴露无意义的分组开关', () => {
    for (const contract of [createPreviewControlContract('zh'), createPreviewControlContract('en')]) {
      expect(contract.canonicalValues).not.toHaveProperty('group');
      expect(getPreviewControlFields(contract.controls).map(control => control.id)).not.toContain('group');
      expect(contract.relatedApis).toContain('ConnectedScatterEncodings.series');
    }

    for (const source of [previewSource]) {
      expect(canonicalDeclarationProps(source)).toMatchObject({
        x: 'urbanization',
        y: 'lifeExpectancy',
        order: 'year',
        series: 'country',
      });
    }
  });
});
