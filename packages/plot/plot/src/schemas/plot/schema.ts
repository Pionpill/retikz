import { CompositeBaseSchema, JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';
import { CoordinateOperationSchema } from '../coordinate';
import { DataRefSchema } from '../data';
import { GuideSchema } from '../guide';
import { MarkOperationSchema } from '../mark';
import { ScaleOperationSchema } from '../scale';
import { TransformOperationSchema } from '../transform';
import { PLOT_NAMESPACE, PlotComposite } from './constants';

export const PlotSpecSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(PLOT_NAMESPACE)
    .describe('Tier 2 domain namespace; routes this node to the plot lowering registered via CompileOptions.composites'),
  type: z
    .literal(PlotComposite.Plot)
    .describe('Composite type within the plot namespace: the top-level grammar-of-graphics spec node'),
  id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional handle for the whole plot; reserved as the scope reference id / anchor target used by composition and interaction (resolution deferred to alpha.5). Zero-cost reservation: alpha.1 only validates the field, attaches no semantics.',
    ),
  data: DataRefSchema.describe(
    'Data binding: a named reference to an externally-supplied dataset plus an optional data model. The dataset values never enter the IR; they are injected at compile time via lowerPlots(datasets).',
  ),
  transform: z
    .array(TransformOperationSchema)
    .optional()
    .describe('Ordered data-transform operation pipeline applied to the bound dataset before scale inference and mark lowering; omit for no transform'),
  scales: z
    .array(ScaleOperationSchema)
    .describe('Named scale ops; built-ins are statically validated, custom types are validated at lowering against runtime scale definitions. Referenced by coordinate roles and non-positional channels by name'),
  colors: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Default plot color palette; omit to use d3-scale-chromatic schemeCategory10. Categorical color scales use it as their range; marks without a color encoding use colors[markIndex % colors.length]. Use "currentColor" to keep the inherited core color.',
    ),
  width: z
    .number()
    .positive()
    .optional()
    .describe(
      "The panel's intrinsic width in user units, used as the plot area sizing basis when this node is composed alongside others. Omit to fall back to the lowerPlots global width, then the built-in default.",
    ),
  height: z
    .number()
    .positive()
    .optional()
    .describe(
      "The panel's intrinsic height in user units, used as the plot area sizing basis when this node is composed alongside others. Omit to fall back to the lowerPlots global height, then the built-in default.",
    ),
  coordinate: CoordinateOperationSchema.describe('The coordinate system operation; built-ins are statically validated, custom types are validated against runtime coordinate definitions'),
  marks: z.array(MarkOperationSchema).min(1).describe('Mark layers, drawn in array order (stable z-order); built-in mark configs or custom type passthrough validated by a runtime MarkDefinition'),
  guides: z
    .array(GuideSchema)
    .optional()
    .describe(
      'Guide layers (axes, each with optional grid lines), derived from scales + coordinate; omit for no guides. Grid lines draw behind marks; axis lines / ticks / labels around the plot area.',
    ),
  meta: JsonObjectSchema.optional().describe(
    'Free-form JSON-serializable source metadata passthrough; reserved so lowering can preserve provenance into core IR meta',
  ),
}).describe(
  'Plot IR root: a JSON-serializable, data-free grammar-of-graphics composite node (namespace "plot"); bound to external data and lowered to core Scope/Node/Path/Step/Coordinate at compile time via lowerPlots',
);
