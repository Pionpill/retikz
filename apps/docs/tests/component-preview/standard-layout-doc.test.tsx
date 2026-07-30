import type { FC } from 'react';

import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import FlexEnDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-basic.en.demo';
import FlexZhDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-basic.zh.demo';
import OverflowEnDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-overflow.en.demo';
import OverflowZhDemo from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-overflow.zh.demo';
import { previewControlContract as flexZhContract } from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-playground.controls';
import { previewSource as flexPlaygroundSource } from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-playground.demo';
import { previewControlContract as flexEnContract } from '../../src/modules/docs/contents/standard/layout/flex-layout/flex-layout-playground.en.controls';
import GridEnDemo from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-basic.en.demo';
import GridZhDemo from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-basic.zh.demo';
import { previewControlContract as gridZhContract } from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-playground.controls';
import { previewSource as gridPlaygroundSource } from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-playground.demo';
import { previewControlContract as gridEnContract } from '../../src/modules/docs/contents/standard/layout/grid-layout/grid-layout-playground.en.controls';
import NestedEnDemo from '../../src/modules/docs/contents/standard/layout/layout-nested.en.demo';
import NestedZhDemo from '../../src/modules/docs/contents/standard/layout/layout-nested.zh.demo';
import OverlayEnDemo from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-basic.en.demo';
import OverlayZhDemo from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-basic.zh.demo';
import { previewControlContract as overlayZhContract } from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-playground.controls';
import { previewSource as overlayPlaygroundSource } from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-playground.demo';
import { previewControlContract as overlayEnContract } from '../../src/modules/docs/contents/standard/layout/overlay-layout/overlay-layout-playground.en.controls';

const FlexPlaygroundCanonical: FC = () => flexPlaygroundSource.canonicalRender?.() ?? null;
const GridPlaygroundCanonical: FC = () => gridPlaygroundSource.canonicalRender?.() ?? null;
const OverlayPlaygroundCanonical: FC = () => overlayPlaygroundSource.canonicalRender?.() ?? null;

const demos: ReadonlyArray<Readonly<{ name: string; Component: FC }>> = [
  { name: 'flex zh', Component: FlexZhDemo },
  { name: 'flex en', Component: FlexEnDemo },
  { name: 'flex overflow zh', Component: OverflowZhDemo },
  { name: 'flex overflow en', Component: OverflowEnDemo },
  { name: 'flex controls', Component: FlexPlaygroundCanonical },
  { name: 'grid zh', Component: GridZhDemo },
  { name: 'grid en', Component: GridEnDemo },
  { name: 'grid controls', Component: GridPlaygroundCanonical },
  { name: 'overlay zh', Component: OverlayZhDemo },
  { name: 'overlay en', Component: OverlayEnDemo },
  { name: 'overlay controls', Component: OverlayPlaygroundCanonical },
  { name: 'nested zh', Component: NestedZhDemo },
  { name: 'nested en', Component: NestedEnDemo },
];

describe('Standard layout documentation demos', () => {
  it.each([
    ['flex', flexZhContract, flexEnContract],
    ['grid', gridZhContract, gridEnContract],
    ['overlay', overlayZhContract, overlayEnContract],
  ])('keeps %s controls structurally aligned across languages', (_name, chinese, english) => {
    expect(english.canonicalValues).toEqual(chinese.canonicalValues);
    expect(english.relatedApis).toEqual(chinese.relatedApis);
    expect(english.controls.sections.map(section => section.controls.map(control => control.id))).toEqual(
      chinese.controls.sections.map(section => section.controls.map(control => control.id)),
    );
  });

  it.each(demos)('derives canonical IR and a real Vanilla SVG for $name', ({ Component }) => {
    const preview = buildPreviewIR(Component);
    const vanilla = buildVanillaPreview(preview);

    expect(preview.ir.children).toHaveLength(1);
    expect(preview.ir.children[0]).toMatchObject({ namespace: 'standard' });
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.code).not.toContain('Unsupported Standard composite');
    expect(vanilla.svg).toContain('<svg');
  });
});
