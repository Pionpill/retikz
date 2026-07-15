import type { FC } from 'react';

import { fadeIn } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import { describe, expect, it } from 'vitest';

import type { PreviewControlSlot } from '../../src/modules/docs/components/component-preview/types';

import {
  mergePreviewControlSlots,
  resolveBuiltinControlSlots,
} from '../../src/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';

const StaticDemo: FC = () => (
  <Layout width={40} height={20}>
    <Node id="static" position={[0, 0]} />
  </Layout>
);

const AnimatedDemo: FC = () => (
  <Layout width={40} height={20}>
    <Node id="animated" position={[0, 0]} animations={[fadeIn()]} />
  </Layout>
);

const slotA: PreviewControlSlot = {
  id: 'slot-a',
  visibility: 'always',
  render: () => null,
};

const slotB: PreviewControlSlot = {
  id: 'slot-b',
  visibility: 'hover',
  render: () => null,
};

describe('preview control providers', () => {
  it('does not resolve animation controls for a static preview by default', () => {
    expect(resolveBuiltinControlSlots({ previewIr: buildPreviewIR(StaticDemo), options: {} })).toEqual([]);
  });

  it('resolves hover animation controls for an animated preview by default', () => {
    expect(resolveBuiltinControlSlots({ previewIr: buildPreviewIR(AnimatedDemo), options: {} })[0]).toMatchObject({
      id: 'animation-controls',
      visibility: 'hover',
    });
  });

  it('force enables animation controls without preview IR', () => {
    expect(resolveBuiltinControlSlots({ previewIr: null, options: { animation: true } })).toHaveLength(1);
  });

  it('force disables animation controls for an animated preview', () => {
    expect(
      resolveBuiltinControlSlots({ previewIr: buildPreviewIR(AnimatedDemo), options: { animation: false } }),
    ).toEqual([]);
  });

  it('merges slot groups in input order', () => {
    expect(mergePreviewControlSlots([slotA], [slotB])).toEqual([slotA, slotB]);
  });

  it('rejects duplicate slot ids', () => {
    expect(() => mergePreviewControlSlots([slotA], [{ ...slotB, id: slotA.id }])).toThrow(
      'Duplicate preview control slot id: "slot-a".',
    );
  });
});
