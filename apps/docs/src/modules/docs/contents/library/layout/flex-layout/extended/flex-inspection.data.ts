import type { IRScene } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { createFlexLayout, FlexLayoutArtifactSchema, FlexLayoutDefinition } from '@retikz/layout';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';

/** 从面板值生成预览与结果表共同使用的 Source IR */
export const createInspectionScene = (values: Readonly<PreviewControlValues>): IRScene => ({
  type: 'scene',
  version: 1,
  children: [
    createFlexLayout({
      size: { x: { kind: 'fixed', value: values.width as number }, y: { kind: 'fixed', value: 180 } },
      padding: 12,
      gap: 8,
      wrap: values.wrap as 'wrap' | 'nowrap',
      alignItems: 'center',
      children: ['A', 'B', 'C'].map((label, index) => ({
        kind: 'flex',
        key: label,
        basis: values.basis as number,
        min: 32,
        child: {
          type: 'node',
          text: ['First Node', 'Secondary Node', 'Third Node'][index],
          style: { stroke: index === 0 ? 'dodgerblue' : 'gray' },
          layout: { minimumSize: { width: 40, height: 36 } },
        },
      })),
    }),
  ],
});

/** 读取真实编译产物；不在面板中另写一套布局计算 */
export const readInspectionRows = (
  values: Readonly<PreviewControlValues>,
  labels: { key: string; line: string; slot: string; actual: string },
) => {
  const output = compileToScene(createInspectionScene(values), {
    composites: [FlexLayoutDefinition],
    measureText: browserMeasurer,
  });
  const envelope = output.artifacts.find(item => item.kind === 'composite');
  if (envelope === undefined) throw new Error('Flex inspection demo did not emit its layout artifact.');

  const artifact = FlexLayoutArtifactSchema.parse(envelope.value);

  return artifact.items.map(item => ({
    [labels.key]: item.key,
    [labels.line]: item.line,
    [labels.slot]: Math.round(item.slotBounds.width * 100) / 100,
    [labels.actual]: Math.round(item.allocationBounds.width * 100) / 100,
  }));
};
