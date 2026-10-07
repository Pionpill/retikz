import { createInputScene } from '@retikz/react';
import { createProcessingController } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderStackPreview as renderComposition } from '../../src/modules/docs/contents/library/standard/collection/stack/stack-composition.preview';
import { renderStackPreview as renderInputs } from '../../src/modules/docs/contents/library/standard/collection/stack/stack-inputs.preview';
import { renderStackPreview as renderLayout } from '../../src/modules/docs/contents/library/standard/collection/stack/stack-layout.preview';
import { synchronousInputAdaptersOf } from '../../src/modules/docs/lib';

it('Stack operation arrows toggle independently in SVG and retained updates', () => {
  const input = (incoming: boolean, outgoing: boolean) =>
    createInputScene(
      renderLayout({
        direction: 'right',
        border: true,
        padding: '8',
        input: incoming,
        output: outgoing,
        reverseArrows: false,
        styled: true,
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
            reverseArrows: false,
            styled: true,
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

it('Stack previews render all inputs and empty states through Vanilla adapters', () => {
  for (const input of ['items', 'data', 'skeleton'] as const) {
    for (const empty of [false, true]) {
      const result = buildVanillaPreview(buildPreviewIR(() => renderInputs({ input, empty, expand: true })));
      expect(result.svg).toContain('<svg');
      expect(result.code).toContain('stack(');
      expect(result.code).toContain('StackInputEmbedAdapter');
    }
  }
});

it('Stack preview preserves nested Matrix and external cell references', () => {
  const result = buildVanillaPreview(
    buildPreviewIR(() => renderComposition({ matrix: true, dashed: true, connect: true })),
  );
  expect(result.svg).toContain('stroke-dasharray');
  expect(result.code).toContain('matrix(');
  expect(result.code).toContain('selected');
});

it.each([true, false])('Stack dashed cell toggles in retained updates with matrix=%s', matrix => {
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
