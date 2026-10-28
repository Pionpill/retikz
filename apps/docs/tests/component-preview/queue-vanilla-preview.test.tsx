import { createInputScene } from '@retikz/react';
import { createProcessingController } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderQueuePreview as renderComposition } from '../../src/modules/docs/contents/library/standard/collection/queue/queue-composition.preview';
import { renderQueuePreview as renderInputs } from '../../src/modules/docs/contents/library/standard/collection/queue/queue-inputs.preview';
import { renderQueuePreview as renderLayout } from '../../src/modules/docs/contents/library/standard/collection/queue/queue-layout.preview';
import { synchronousInputAdaptersOf } from '../../src/modules/docs/lib';

it('Queue 操作箭头在 SVG 与保留模式更新中可独立切换', () => {
  const input = (incoming: boolean, outgoing: boolean) =>
    createInputScene(
      renderLayout({
        direction: 'right',
        border: true,
        padding: '8',
        input: incoming,
        output: outgoing,
        styled: true,
        count: '3',
      }).props.children,
    );
  const first = input(true, true);
  const controller = createProcessingController(first.scene, { adapters: synchronousInputAdaptersOf(first.adapters) });
  try {
    for (const [incoming, outgoing] of [
      [false, true],
      [true, false],
      [false, false],
      [true, true],
    ]) {
      controller.update(input(incoming, outgoing).scene);
      const serialized = JSON.stringify(controller.read().scene);
      expect(serialized.includes('dodgerblue')).toBe(incoming);
      expect(serialized.includes('darkorange')).toBe(outgoing);
      const result = buildVanillaPreview(
        buildPreviewIR(() =>
          renderLayout({
            direction: 'right',
            border: true,
            padding: '8',
            input: incoming,
            output: outgoing,
            styled: true,
            count: '3',
          }),
        ),
      );
      expect(result.svg?.includes('dodgerblue')).toBe(incoming);
      expect(result.svg?.includes('darkorange')).toBe(outgoing);
    }
  } finally {
    controller.dispose();
  }
});

it('Queue 预览通过 Vanilla 适配器渲染所有输入和空状态', () => {
  for (const input of ['items', 'data', 'skeleton'] as const) {
    for (const empty of [false, true]) {
      const result = buildVanillaPreview(buildPreviewIR(() => renderInputs({ input, empty, expand: true })));
      expect(result.svg).toContain('<svg');
      expect(result.code).toContain('queue(');
      expect(result.code).toContain('queueInputEmbedAdapter');
    }
  }
});

it('Queue 预览保留嵌套的 Matrix 和外部单元格引用', () => {
  const result = buildVanillaPreview(
    buildPreviewIR(() => renderComposition({ matrix: true, dashed: true, connect: true })),
  );
  expect(result.svg).toContain('stroke-dasharray');
  expect(result.code).toContain('matrix(');
  expect(result.code).toContain('selected');
});

it.each([true, false])('matrix=%s 时 Queue 虚线单元格在保留模式更新中可切换', matrix => {
  const input = (dashed: boolean) =>
    createInputScene(renderComposition({ matrix, dashed, connect: true }).props.children);
  const first = input(true);
  const controller = createProcessingController(first.scene, { adapters: synchronousInputAdaptersOf(first.adapters) });
  try {
    for (const dashed of [false, true, false]) {
      controller.update(input(dashed).scene);
      expect(JSON.stringify(controller.read().scene).includes('"dashPattern":[4,3]')).toBe(dashed);
    }
  } finally {
    controller.dispose();
  }
});

it('Queue 数量变化时保留模式更新可在各个方向移除并恢复两个操作箭头', () => {
  for (const direction of ['up', 'down', 'left', 'right'] as const) {
    const input = (count: '0' | '1' | '3') =>
      createInputScene(
        renderLayout({ direction, border: true, padding: '8', input: true, output: true, styled: true, count }).props
          .children,
      );
    const first = input('3');
    const controller = createProcessingController(first.scene, {
      adapters: synchronousInputAdaptersOf(first.adapters),
    });
    try {
      for (const count of ['0', '1', '3'] as const) {
        controller.update(input(count).scene);
        const output = JSON.stringify(controller.read().scene);
        for (const color of ['dodgerblue', 'darkorange']) expect(output.includes(color)).toBe(count !== '0');
      }
    } finally {
      controller.dispose();
    }
  }
});
