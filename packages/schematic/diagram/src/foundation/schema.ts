import { NodeSchema, TextBlockSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutGapSchema, LayoutOverflowSchema } from '@retikz/layout';
import { LegendSchema, SurfaceInputSchema } from '@retikz/standard';
import { enum as zodEnum, strictObject } from 'zod';

import { RetikzDiagramError, RetikzDiagramErrorCode } from './errors';

const rejectUndefinedFields = (
  value: Record<string, unknown>,
  context: { addIssue: (issue: { code: 'custom'; path: Array<string>; message: string }) => void },
): void => {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `Field '${key}' must be omitted instead of undefined.`,
      });
    }
  }
};

const hasTextContent = (value: unknown): boolean => {
  if (typeof value === 'string') return value.length > 0;
  if (!Array.isArray(value)) return false;

  return value.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if (line === null || typeof line !== 'object') return false;
    if ('text' in line && typeof line.text === 'string') return line.text.length > 0;
    if (!('runs' in line) || !Array.isArray(line.runs)) return false;
    return line.runs.some((run: unknown) => {
      if (run === null || typeof run !== 'object') return false;
      if ('text' in run && typeof run.text === 'string') return run.text.length > 0;
      return 'tex' in run && typeof run.tex === 'string' && run.tex.length > 0;
    });
  });
};

const textBlockField = TextBlockSchema.optional();

/** Diagram Presentation 的闭合 schema */
export const DiagramPresentationSchema = strictObject({
  title: textBlockField.describe('Optional Core TextBlock displayed in the Diagram heading.'),
  description: textBlockField.describe('Optional Core TextBlock displayed below the Diagram title.'),
  legend: LegendSchema.optional().describe('Optional canonical Standard Legend composite.'),
})
  .superRefine((presentation, context) => {
    rejectUndefinedFields(presentation, context);
    if (
      presentation.title === undefined &&
      presentation.description === undefined &&
      presentation.legend === undefined
    ) {
      context.addIssue({ code: 'custom', path: [], message: 'Diagram Presentation must contain at least one slot.' });
    }
    if (presentation.title !== undefined && !hasTextContent(presentation.title)) {
      context.addIssue({
        code: 'custom',
        path: ['title'],
        message: 'Diagram title must contain non-empty text or TeX.',
      });
    }
    if (presentation.description !== undefined && !hasTextContent(presentation.description)) {
      context.addIssue({
        code: 'custom',
        path: ['description'],
        message: 'Diagram description must contain non-empty text or TeX.',
      });
    }
  })
  .describe('Closed JSON-safe Diagram Presentation slots.');

const LegendPositionSchema = zodEnum(['top', 'right', 'bottom', 'left']);
const LegendAlignSchema = zodEnum(['start', 'center', 'end']);

/** Diagram Frame 的闭合稀疏 schema */
export const DiagramFrameSchema = strictObject({
  legendPosition: LegendPositionSchema.optional().describe('Physical side where the Legend is placed.'),
  legendAlign: LegendAlignSchema.optional().describe('Tangential alignment of the Legend on its docking side.'),
  padding: SurfaceInputSchema.shape.padding.describe('Surface padding override.'),
  titleDescriptionGap: LayoutGapSchema.optional().describe('Gap between title and description.'),
  headingMainGap: LayoutGapSchema.optional().describe('Gap between heading and main.'),
  drawingLegendGap: LayoutGapSchema.optional().describe('Gap between drawing and Legend.'),
  overflow: LayoutOverflowSchema.optional().describe('Surface overflow policy.'),
  background: SurfaceInputSchema.shape.background.describe('Surface background override.'),
  border: SurfaceInputSchema.shape.border.describe('Surface border override.'),
  cornerRadius: SurfaceInputSchema.shape.cornerRadius.describe('Surface corner radius override.'),
})
  .superRefine((frame, context) => {
    rejectUndefinedFields(frame, context);
    if (Object.keys(frame).length === 0) {
      context.addIssue({ code: 'custom', path: [], message: 'Diagram Frame must contain at least one field.' });
    }
  })
  .describe('Closed sparse Diagram Frame contract.');

const DiagramFrameThemeSchema = strictObject({
  padding: SurfaceInputSchema.shape.padding.describe('Surface padding default.'),
  titleDescriptionGap: LayoutGapSchema.optional().describe('Title-description gap default.'),
  headingMainGap: LayoutGapSchema.optional().describe('Heading-main gap default.'),
  drawingLegendGap: LayoutGapSchema.optional().describe('Drawing-Legend gap default.'),
  background: SurfaceInputSchema.shape.background.describe('Surface background default.'),
  border: SurfaceInputSchema.shape.border.describe('Surface border default.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe('Surface corner radius default.'),
})
  .superRefine((slice, context) => {
    rejectUndefinedFields(slice, context);
    if (Object.keys(slice).length === 0) {
      context.addIssue({ code: 'custom', path: [], message: 'Diagram Theme frame slice must not be empty.' });
    }
  })
  .describe('Sparse Diagram Theme frame appearance slice.');

const DiagramTextAppearanceSchema = strictObject({
  textColor: NodeSchema.shape.textColor.describe('Block text color.'),
  opacity: NodeSchema.shape.opacity.describe('Block opacity.'),
  font: NodeSchema.shape.font.describe('Block font defaults.'),
  align: NodeSchema.shape.align.describe('Block text alignment.'),
  lineHeight: NodeSchema.shape.lineHeight.describe('Block line height.'),
  maxTextWidth: NodeSchema.shape.maxTextWidth.describe('Block maximum text width.'),
})
  .superRefine((slice, context) => {
    rejectUndefinedFields(slice, context);
    if (Object.keys(slice).length === 0) {
      context.addIssue({ code: 'custom', path: [], message: 'Diagram Theme text slice must not be empty.' });
    }
  })
  .describe('Sparse block-level Diagram text appearance slice.');

/** Diagram Theme 的闭合稀疏 schema */
export const DiagramThemeSchema = strictObject({
  frame: DiagramFrameThemeSchema.optional(),
  title: DiagramTextAppearanceSchema.optional(),
  description: DiagramTextAppearanceSchema.optional(),
})
  .superRefine((theme, context) => {
    rejectUndefinedFields(theme, context);
    if (Object.keys(theme).length === 0) {
      context.addIssue({ code: 'custom', path: [], message: 'Diagram Theme must contain at least one slice.' });
    }
  })
  .describe('Closed sparse Diagram Theme contract.');

/** 防止外部误用错误类型的内部校验入口 */
export const assertValidDiagramStyleName = (name: unknown): string => {
  const parsed = NonBlankStringSchema.safeParse(name);
  if (!parsed.success) {
    throw new RetikzDiagramError(
      RetikzDiagramErrorCode.DefinitionCallbackFailed,
      'Diagram Theme style name must be a non-empty string.',
      { reason: 'invalid style name' },
      parsed.error,
    );
  }
  return parsed.data;
};

export { DiagramFrameThemeSchema, DiagramTextAppearanceSchema };
