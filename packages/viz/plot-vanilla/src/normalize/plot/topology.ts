import type { IRPlotTransform } from '@retikz/plot';

import { PlotTransform } from '@retikz/plot';

import type { NormalizationState, PlotAuthoringContext } from './contracts';

import { buildShortcutTransforms } from './scale-coordinate';

type Collected = NormalizationState;

/** 归并根 transforms、声明 transforms 与 mark shortcut transforms */
export const assembledTransformsOf = (collected: Collected, context: PlotAuthoringContext): Array<IRPlotTransform> => {
  const explicitTransforms: Array<IRPlotTransform> = [...(context.dataTransforms ?? []), ...collected.transforms];
  const shortcutTransforms = [
    ...collected.shortcutTransforms,
    ...buildShortcutTransforms(collected.marks, context.markTransformShortcuts),
  ];
  const stackSignature = (transform: IRPlotTransform): string =>
    transform.kind === PlotTransform.Stack
      ? JSON.stringify([
          transform.x ?? null,
          transform.y,
          transform.groupBy ?? null,
          transform.offset ?? 'zero',
          transform.startField ?? null,
          transform.endField ?? null,
        ])
      : '';
  const explicitStackSignatures = new Set(
    explicitTransforms.filter(transform => transform.kind === PlotTransform.Stack).map(stackSignature),
  );
  return [
    ...explicitTransforms,
    ...shortcutTransforms.filter(
      transform => transform.kind !== PlotTransform.Stack || !explicitStackSignatures.has(stackSignature(transform)),
    ),
  ];
};
