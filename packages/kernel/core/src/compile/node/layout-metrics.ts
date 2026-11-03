import { RAD_TO_DEG } from '@retikz/math';

import type { LayoutAlignmentGuide } from '../../contract';
import { BuiltinLayoutAlignmentGuideName, LayoutAlignmentGuideDimension } from '../../contract';
import type { CompiledNodeLayout } from './types';

const isEffectiveIdentityRotation = (degrees: number): boolean => Object.is(degrees % 360, -0) || degrees % 360 === 0;

/** 从同次 Node 正文排版结果投影 child-local baseline guides */
export const alignmentGuidesOfNode = (
  layout: CompiledNodeLayout,
  round: (value: number) => number,
): Array<LayoutAlignmentGuide> | undefined => {
  const text = layout.text;
  const offsets = text?.baselineOffsets;
  if (
    text === undefined ||
    offsets === undefined ||
    offsets.length === 0 ||
    !isEffectiveIdentityRotation((layout.geometry.rect.rotate ?? 0) * RAD_TO_DEG)
  ) {
    return undefined;
  }

  const blockTop = layout.geometry.contentCenter[1] - layout.geometry.contentSize.height / 2;
  const firstBaseline = round(blockTop + offsets[0]);
  if (text.kind === 'inline') {
    return [
      {
        name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: firstBaseline,
      },
      {
        name: BuiltinLayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: round(blockTop + offsets[offsets.length - 1]),
      },
    ];
  }

  const emittedLineHeight = round(text.lineHeight);

  return [
    {
      name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline,
    },
    {
      name: BuiltinLayoutAlignmentGuideName.LastBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline + (offsets.length - 1) * emittedLineHeight,
    },
  ];
};
