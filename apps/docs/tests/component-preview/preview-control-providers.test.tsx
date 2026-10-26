import { fadeIn } from '@retikz/core';
import { RibbonPathDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';
import { describe, expect, it } from 'vitest';

import {
  mergePreviewControlSlots,
  resolveBuiltinControlSlots,
} from '../../src/modules/docs/components/component-preview/controls';
import type { PreviewControlSlot } from '../../src/modules/docs/components/component-preview/types';
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

const RibbonDemo: FC = () => (
  <Layout width={40} height={20} extensions={{ paths: [RibbonPathDefinition] }}>
    <Node id="ribbon" position={[0, 0]} />
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

describe('预览控件提供者', () => {
  it('默认情况下不解析静态预览的动画控件', () => {
    expect(resolveBuiltinControlSlots({ previewIr: buildPreviewIR(StaticDemo), options: {} })).toEqual([]);
  });

  it('默认解析动画预览的悬停动画控件', () => {
    expect(resolveBuiltinControlSlots({ previewIr: buildPreviewIR(AnimatedDemo), options: {} })[0]).toMatchObject({
      id: 'animation-controls',
      visibility: 'hover',
    });
  });

  it('强制启用动画控件，无需预览 IR', () => {
    expect(resolveBuiltinControlSlots({ previewIr: null, options: { animation: true } })).toHaveLength(1);
  });

  it('强制禁用动画预览的动画控件', () => {
    expect(
      resolveBuiltinControlSlots({ previewIr: buildPreviewIR(AnimatedDemo), options: { animation: false } }),
    ).toEqual([]);
  });

  it('在解析预览控件时保留通用路径定义', () => {
    expect(buildPreviewIR(RibbonDemo).paths).toEqual([RibbonPathDefinition]);
  });

  it('按输入顺序合并槽组', () => {
    expect(mergePreviewControlSlots([slotA], [slotB])).toEqual([slotA, slotB]);
  });

  it('拒绝重复的槽 ID', () => {
    expect(() => mergePreviewControlSlots([slotA], [{ ...slotB, id: slotA.id }])).toThrow(
      'Duplicate preview control slot id: "slot-a".',
    );
  });
});
