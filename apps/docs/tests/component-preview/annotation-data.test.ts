import { compileToScene, fallbackMeasurer, resolveCoreProviderDependencies } from '@retikz/core';
import { expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { resolvePreviewControlContract } from '../../src/modules/docs/components/component-preview/registry';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { createAnnotationDataControls } from '../../src/modules/docs/contents/viz/plot/mark/annotation/annotation-data-control-factory';
import {
  AnnotationDataPointPreview,
  AnnotationDataPathPreview,
  AnnotationDataIntervalPreview,
} from '../../src/modules/docs/contents/viz/plot/mark/annotation/annotation-data.preview';

it('三类数据标注的双语控件默认值只包含各自可写字段且完整', () => {
  for (const geometry of ['point', 'path', 'interval'] as const) {
    for (const lang of ['zh', 'en'] as const) {
      const contract = createAnnotationDataControls(geometry, lang);
      expect(resolvePreviewControlContract({ previewControlContract: contract })).toBeDefined();
      expect(Object.keys(contract.canonicalValues).sort()).toEqual(
        getPreviewControlFields(contract.controls)
          .map(field => field.id)
          .sort(),
      );
    }
  }
});

it('三类数据标注在坐标系、分组、统计量与边界组合下均可派生可编译的预览', () => {
  for (const render of [AnnotationDataPointPreview, AnnotationDataPathPreview, AnnotationDataIntervalPreview])
    for (const coordinate of ['cartesian', 'polar2D'] as const)
      for (const grouped of [false, true])
        for (const fullX of [false, true])
          for (const statistic of ['mean', 'median'] as const) {
            const preview = buildPreviewIR(() => render({ coordinate, grouped, fullX, statistic }));
            expect(preview.ir.children.length).toBeGreaterThan(0);
            expect(() =>
              compileToScene(preview.ir, {
                measureText: fallbackMeasurer,
                ...resolveCoreProviderDependencies({ contributions: preview.contributions }),
              }),
            ).not.toThrow();
          }
});
