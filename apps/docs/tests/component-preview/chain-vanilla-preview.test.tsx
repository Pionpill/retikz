import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderChainPreview as connection } from '../../src/modules/docs/contents/library/standard/collection/chain/chain-connection.preview';
import { renderChainPreview as content } from '../../src/modules/docs/contents/library/standard/collection/chain/chain-content.preview';
import { renderChainPreview as inputs } from '../../src/modules/docs/contents/library/standard/collection/chain/chain-inputs.preview';

it('每种输入实际通过 Vanilla 转换与渲染', () => {
  for (const mode of ['items', 'data', 'count', 'labels', 'branches'] as const) {
    const v = buildVanillaPreview(buildPreviewIR(() => inputs({ mode })));

    expect(v.svg).toContain('<svg');
    expect(v.code).toContain('chain(');
    expect(v.code).toContain('ChainInputEmbedAdapter');
  }
});
it('嵌套图形和箭头转换可执行', () => {
  const v = buildVanillaPreview(buildPreviewIR(() => content({ width: 64, overflow: 'clip' })));

  expect(v.svg).toContain('<svg');
  expect(v.code).toContain('matrix(');

  const a = buildVanillaPreview(buildPreviewIR(() => connection({ route: 'auto', arrow: '<->', label: 'Chain' })));

  expect(a.svg).toContain('Chain');
  expect(a.code).toContain('marks:');
});
