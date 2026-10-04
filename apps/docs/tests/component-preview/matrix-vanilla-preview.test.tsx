import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderMatrixPreview as renderContent } from '../../src/modules/docs/contents/library/standard/collection/matrix/matrix-content.preview';
import { renderMatrixPreview as renderReference } from '../../src/modules/docs/contents/library/standard/collection/matrix/matrix-reference.preview';
import { renderMatrixPreview as renderSkeleton } from '../../src/modules/docs/contents/library/standard/collection/matrix/matrix-skeleton.preview';

it('Matrix preview renders data and nested JSX through real Vanilla adapters', () => {
  for (const mode of ['data', 'jsx'] as const) {
    const preview = buildPreviewIR(() => renderContent({ mode, expand: 'all' }));
    const vanilla = buildVanillaPreview(preview);
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.code).toContain('matrix(');
    expect(vanilla.code).toContain('MatrixInputEmbedAdapter');
    expect(vanilla.code).not.toContain('Failed');
  }
});
it('Matrix preview preserves skeletons and generated cell endpoints', () => {
  const skeleton = buildVanillaPreview(
    buildPreviewIR(() => renderSkeleton({ rows: 2, columns: 3, mode: 'symbols', index: 'auto' })),
  );
  expect(skeleton.code).toContain('skeleton:');
  expect(skeleton.svg).toContain('x11');
  const reference = buildVanillaPreview(
    buildPreviewIR(() => renderReference({ row: 1, column: 0, overflow: 'clip', label: 'M' })),
  );
  expect(reference.svg).toContain('<svg');
  expect(reference.code).toContain('m-1-0');
});
