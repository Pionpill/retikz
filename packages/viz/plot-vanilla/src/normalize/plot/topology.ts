import type { IRDataStackTransform, IRDataTransform, IRDataTransformDeclaration } from '@retikz/data';
import { DataTransform } from '@retikz/data';

import type { NormalizationState, PlotAuthoringContext } from './contracts';
import { buildShortcutTransforms } from './scale-coordinate';

type Collected = NormalizationState;

const isStackTransform = (transform: IRDataTransform): transform is IRDataStackTransform =>
  transform.kind === DataTransform.Stack;

/** 归并根 transforms、声明 transforms 与 mark shortcut transforms */
export const assembledTransformsOf = (
  collected: Collected,
  context: PlotAuthoringContext,
): Array<IRDataTransformDeclaration> => {
  const explicitTransforms = [...(context.dataTransforms ?? []), ...collected.transforms];
  const shortcutTransforms = [
    ...collected.shortcutTransforms,
    ...buildShortcutTransforms(collected.marks, context.markTransformShortcuts),
  ];
  const stackSignature = (transform: IRDataStackTransform): string =>
    JSON.stringify([
      transform.x ?? null,
      transform.y,
      transform.groupBy ?? null,
      transform.offset ?? 'zero',
      transform.startField ?? null,
      transform.endField ?? null,
    ]);
  const explicitStackSignatures = new Set(
    explicitTransforms
      .map(declaration => declaration.operation)
      .filter(isStackTransform)
      .map(stackSignature),
  );

  return [
    ...explicitTransforms,
    ...shortcutTransforms
      .filter(transform => !isStackTransform(transform) || !explicitStackSignatures.has(stackSignature(transform)))
      .map(operation => ({ operation })),
  ];
};
