import type { FC, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { PreviewSourceConfig } from '../../src/modules/docs/components/component-preview/types';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { previewSource as customPatternPreviewSource } from '../../src/modules/docs/contents/kernel/visual/style/custom-pattern/custom-pattern-size.demo';
import { previewSource as builtinPatternPreviewSource } from '../../src/modules/docs/contents/kernel/visual/style/pattern/pattern-playground.demo';

const canonicalComponent = (previewSource: PreviewSourceConfig): FC => {
  const render = previewSource.canonicalRender;
  if (render === undefined) throw new Error('pattern controls demo must provide canonicalRender');
  return (): ReactNode => render();
};

describe('图案控件的文档运行时', () => {
  it.each([
    ['built-in pattern', builtinPatternPreviewSource],
    ['custom pattern', customPatternPreviewSource],
  ])('%s 规范 IR 通过 JSON 序列化保持无损', (_name, previewSource) => {
    const ir = buildPreviewIR(canonicalComponent(previewSource)).ir;

    expect(ir).toStrictEqual(JSON.parse(JSON.stringify(ir)));
  });
});
