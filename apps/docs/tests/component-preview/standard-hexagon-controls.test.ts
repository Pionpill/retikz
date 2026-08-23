import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { previewControlContract as hexagonZh } from '@/modules/docs/contents/library/standard/extension/shape/hexagon-example.controls';
import { previewSource } from '@/modules/docs/contents/library/standard/extension/shape/hexagon-example.demo';
import { previewControlContract as hexagonEn } from '@/modules/docs/contents/library/standard/extension/shape/hexagon-example.en.controls';

describe('Standard Hexagon controls', () => {
  it('用固定 user-unit 肩深替代随总宽增长的肩部比例', () => {
    expect(
      getPreviewControlFields(hexagonZh.controls).map(field => ({
        kind: field.kind,
        id: field.id,
        defaultValue: field.defaultValue,
      })),
    ).toEqual([
      { kind: 'range', id: 'shoulderDepth', defaultValue: 12 },
      { kind: 'range', id: 'cornerRadius', defaultValue: 4 },
    ]);
    expect(hexagonZh.canonicalValues).toEqual({ shoulderDepth: 12, cornerRadius: 4 });
    expect(hexagonEn.canonicalValues).toEqual(hexagonZh.canonicalValues);

    const canonicalIR = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null).ir;
    expect(JSON.stringify(canonicalIR)).toContain('"shoulderDepth":12');
    expect(JSON.stringify(canonicalIR)).not.toContain('shoulderRatio');
  });
});
