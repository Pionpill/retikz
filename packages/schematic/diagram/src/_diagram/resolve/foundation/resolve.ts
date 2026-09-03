import { resolveBoxSpacing, Side } from '@retikz/core';
import { LayoutAlignment, LayoutOverflow } from '@retikz/layout';

import type { DiagramFoundationResolution, DiagramFoundationResolveContext, DiagramFoundationSource } from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { resolveDiagramTheme } from '../theme';

/** 解析 drawing-core-agnostic 的 Diagram Foundation */
export const resolveDiagramFoundation = (
  source: DiagramFoundationSource,
  context: DiagramFoundationResolveContext,
): DiagramFoundationResolution => {
  const explicitFrame = source.frame;
  if (
    source.presentation?.legend === undefined &&
    (explicitFrame?.legendPosition !== undefined ||
      explicitFrame?.legendAlign !== undefined ||
      explicitFrame?.drawingLegendGap !== undefined)
  ) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.ResolveInvalid,
      message: 'Diagram Frame Legend placement requires an explicit Presentation Legend.',
      details: {
        capability: 'diagram-foundation',
        reason: 'Legend position, alignment, and drawing gap are invalid without a Presentation Legend.',
      },
    });
  }

  const theme = resolveDiagramTheme(context.theme, context.diagramThemeStyles, source.diagramTheme);
  const frame: DiagramFoundationResolution['frame'] = {
    legendPosition: explicitFrame?.legendPosition ?? Side.Right,
    legendAlign: explicitFrame?.legendAlign ?? LayoutAlignment.Start,
    titleDescriptionGap: explicitFrame?.titleDescriptionGap ?? theme.frame.titleDescriptionGap,
    headingMainGap: explicitFrame?.headingMainGap ?? theme.frame.headingMainGap,
    drawingLegendGap: explicitFrame?.drawingLegendGap ?? theme.frame.drawingLegendGap,
    padding: explicitFrame?.padding === undefined ? theme.frame.padding : resolveBoxSpacing(explicitFrame.padding, 0),
    cornerRadius: explicitFrame?.cornerRadius ?? theme.frame.cornerRadius,
    overflow: explicitFrame?.overflow ?? LayoutOverflow.Visible,
    ...(explicitFrame?.background === undefined
      ? theme.frame.background === undefined
        ? {}
        : { background: theme.frame.background }
      : { background: explicitFrame.background }),
    ...(explicitFrame?.border === undefined
      ? theme.frame.border === undefined
        ? {}
        : { border: theme.frame.border }
      : { border: explicitFrame.border }),
  };

  return {
    ...(source.presentation === undefined ? {} : { presentation: source.presentation }),
    frame,
    presentationAppearance: theme.presentation,
  };
};
