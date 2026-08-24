import { CompositeBaseSchema, JsonObjectSchema, TextBlockSchema } from '@retikz/core';
import { DataReferenceSchema } from '@retikz/data';
import { NonBlankStringSchema, NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import {
  array,
  boolean,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  null as zodNull,
  number,
  record,
  strictObject,
  string,
  union,
} from 'zod';

import { CoordinateOperationSchema } from '../coordinate';
import { GuideSchema, GuideTextStyleSchema } from '../guide';
import { BoxPaddingSchema } from '../layout';
import { MarkOperationSchema } from '../mark';
import { ScaleOperationSchema } from '../scale';
import { PlotAxisThemeTokenRulesSchema, PlotThemeSchema, PlotThemeTokenOverridesSchema } from '../theme';
import { TransformSchema } from '../transform';
import {
  CompositionAxisResolve,
  CompositionGridResolve,
  CompositionScaleResolve,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  FacetEmptyPolicy,
  PLOT_NAMESPACE,
  PlotComposite,
  ScaffoldFrameMode,
} from './constants';

export const CompositionSpacingSchema = strictObject({
  panelGap: NonNegativeNumberSchema.optional().describe('Gap between generated facet panels in user units'),
  trackGap: NonNegativeNumberSchema.optional().describe('Gap between tracks in a track arrangement in user units'),
  axisGap: NonNegativeNumberSchema.optional().describe('Outward gap between axes that share the same side or edge'),
  labelGap: NonNegativeNumberSchema.optional().describe(
    'Gap between panel, track, or axis title labels and their related plot area',
  ),
  padding: BoxPaddingSchema.optional().describe('Optional outer padding applied to composition frame calculation'),
}).describe('Plot composition spacing configuration');

export const CompositionResolveSchema = strictObject({
  scale: record(NonBlankStringSchema, zodEnum(CompositionScaleResolve))
    .optional()
    .describe('Per-coordinate-role scale resolution mode'),
  axis: record(NonBlankStringSchema, zodEnum(CompositionAxisResolve))
    .optional()
    .describe('Per-coordinate-role axis rendering mode'),
  grid: record(NonBlankStringSchema, zodEnum(CompositionGridResolve))
    .optional()
    .describe('Per-coordinate-role default grid projection mode'),
}).describe('Composition-level scale, axis, and grid resolution policy');

const CoordinateViewRootPlacementSchema = strictObject({
  kind: literal(CoordinateViewPlacementKind.Root).describe('Placement kind: this view occupies the root plot area'),
}).describe('Root coordinate view placement');

const CoordinateViewSlotPlacementSchema = strictObject({
  kind: literal(CoordinateViewPlacementKind.Slot).describe(
    'Placement kind: this view occupies a named arrangement slot',
  ),
  arrangement: NonBlankStringSchema.describe('Arrangement id that owns this slot'),
  slot: NonBlankStringSchema.describe('Slot key this view occupies inside the arrangement'),
}).describe('Arrangement slot coordinate view placement');

const CoordinateViewOverlayPlacementSchema = strictObject({
  kind: literal(CoordinateViewPlacementKind.Overlay).describe(
    'Placement kind: this view overlays another coordinate view',
  ),
  target: NonBlankStringSchema.describe('Target coordinate view id this view overlays'),
  zIndex: number()
    .optional()
    .describe('Relative mark-layer z-order hint inside the shared overlay panel; omit to use view declaration order'),
}).describe('Overlay coordinate view placement');

export const CoordinateViewPlacementSchema = discriminatedUnion('kind', [
  CoordinateViewRootPlacementSchema,
  CoordinateViewSlotPlacementSchema,
  CoordinateViewOverlayPlacementSchema,
]).describe('Coordinate view placement kind and payload');

export const CoordinateViewSchema = strictObject({
  id: NonBlankStringSchema.describe('Stable coordinate view id referenced by marks and axis guides'),
  coordinate: CoordinateOperationSchema.describe('Coordinate operation owned by this view'),
  placement: CoordinateViewPlacementSchema.optional().describe(
    'Optional placement of this coordinate view in the plot composition; omit means root placement during normalization',
  ),
  meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable metadata for this coordinate view'),
}).describe('Coordinate view registered inside a plot composition');

const FacetValueSchema = union([string(), number(), boolean(), zodNull()]).describe(
  'JSON-safe scalar facet value used in facet ordering and panel keys',
);

const FacetLabelOverrideSchema = strictObject({
  value: FacetValueSchema.describe('Facet value whose generated header label is overridden'),
  label: TextBlockSchema.describe('Display text block used for this facet value in generated headers'),
}).describe('Display label override for one facet value');

const FacetDimensionSchema = strictObject({
  field: NonBlankStringSchema.describe('Data field path used to split rows into facet panels'),
  order: array(FacetValueSchema)
    .optional()
    .describe('Explicit facet value order; values not listed are appended in first-seen order'),
  labels: array(FacetLabelOverrideSchema)
    .optional()
    .describe('Optional display labels for facet values; unmatched values fall back to String(value)'),
}).describe('Facet dimension bound to a data field');

const FacetDimensionsSchema = union([FacetDimensionSchema, array(FacetDimensionSchema).min(1)]).describe(
  'One or more facet dimensions bound to data fields',
);

const FacetHeaderLabelSchema = strictObject({
  ...GuideTextStyleSchema.shape,
  rotate: number().optional().describe('Facet label rotation in degrees around the label center'),
}).describe('Facet header label text style');

const FacetHeaderLabelValueSchema = union([boolean(), FacetHeaderLabelSchema]).describe(
  'Facet label visibility or text style',
);

const FacetHeaderSchema = strictObject({
  row: FacetHeaderLabelValueSchema.optional().describe('Whether generated row labels are visible or styled'),
  column: FacetHeaderLabelValueSchema.optional().describe('Whether generated column labels are visible or styled'),
}).describe('Facet header visibility and text style');

export const FacetArrangementSchema = strictObject({
  kind: literal(CoordinateArrangementKind.Facet).describe('Arrangement discriminator: data-driven facet panels'),
  id: NonBlankStringSchema.describe('Stable facet arrangement id used to derive panel view ids and provenance'),
  view: NonBlankStringSchema.describe('Template coordinate view used by generated facet panels'),
  row: FacetDimensionsSchema.optional().describe(
    'Facet row dimension or ordered row-dimension hierarchy; omit for a one-dimensional column facet',
  ),
  column: FacetDimensionsSchema.optional().describe(
    'Facet column dimension or ordered column-dimension hierarchy; omit for a one-dimensional row facet',
  ),
  empty: zodEnum(FacetEmptyPolicy)
    .optional()
    .describe('Empty-panel policy; omit to drop row/column combinations that have no rows'),
  header: FacetHeaderSchema.optional().describe('Facet row and column label visibility'),
  resolve: CompositionResolveSchema.optional().describe('Facet-local scale, axis, and grid resolution policy'),
  spacing: CompositionSpacingSchema.optional().describe('Facet-local spacing override'),
  coordinate: CoordinateOperationSchema.optional().describe(
    'Coordinate operation used by every generated panel; omit to inherit the template view coordinate',
  ),
  viewIdTemplate: NonBlankStringSchema.optional().describe(
    'Panel view id template supporting {arrangement}, {row}, {column}, and {panel} placeholders',
  ),
})
  .superRefine((facet, ctx) => {
    if (facet.row === undefined && facet.column === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['row'],
        message: 'facet grid requires at least one of row or column',
      });
    }
  })
  .describe('Facet arrangement that derives panel coordinate views from data rows');

const ScaffoldTrackBandSchema = strictObject({
  role: NonBlankStringSchema.describe('Coordinate role localized into this track band'),
  start: number().min(0).max(1).describe('Track band start fraction in arrangement-local coordinates'),
  end: number().min(0).max(1).describe('Track band end fraction in arrangement-local coordinates'),
}).describe('Fractional role band occupied by one track arrangement lane');

export const TrackArrangementTrackSchema = strictObject({
  id: NonBlankStringSchema.describe('Stable track id within its track arrangement'),
  view: NonBlankStringSchema.optional().describe('Explicit coordinate view id for this track; omit to derive one'),
  band: ScaffoldTrackBandSchema.describe('Local role band assigned to this track'),
  order: number().optional().describe('Optional track ordering hint; omit to use declaration order'),
  coordinate: CoordinateOperationSchema.optional().describe('Coordinate override for this track view'),
  header: boolean().optional().describe('Whether this track label is visible'),
}).describe('Track registered under a shared track arrangement');

const TrackHeaderSchema = strictObject({
  track: boolean().optional().describe('Whether generated track labels are visible'),
}).describe('Track arrangement header visibility');

export const TrackArrangementSchema = strictObject({
  kind: literal(CoordinateArrangementKind.Tracks).describe('Arrangement discriminator: shared coordinate tracks'),
  id: NonBlankStringSchema.describe('Stable track arrangement id used to derive track view ids and provenance'),
  coordinate: CoordinateOperationSchema.describe('Base coordinate operation owned by this track arrangement'),
  sharedRoles: array(NonBlankStringSchema).describe(
    'Coordinate roles whose scale domain and range are shared across tracks',
  ),
  frame: zodEnum(ScaffoldFrameMode)
    .optional()
    .describe('Frame sharing mode for track views; omit to share the track arrangement frame'),
  tracks: array(TrackArrangementTrackSchema).min(1).describe('Tracks mounted in this arrangement'),
  header: TrackHeaderSchema.optional().describe('Track label visibility'),
  resolve: CompositionResolveSchema.optional().describe('Track-local scale, axis, and grid resolution policy'),
  spacing: CompositionSpacingSchema.optional().describe('Track-local spacing override'),
  viewIdTemplate: NonBlankStringSchema.optional().describe(
    'Track view id template supporting {arrangement} and {track} placeholders',
  ),
}).describe('Shared track arrangement that derives coordinate views for tracks');

export const CoordinateArrangementSchema = discriminatedUnion('kind', [
  FacetArrangementSchema,
  TrackArrangementSchema,
]).describe('Coordinate arrangement generator for facets or shared tracks');

export const CoordinateCompositionSchema = strictObject({
  defaultView: NonBlankStringSchema.describe('Coordinate view id used when a mark or axis guide omits coordinateView'),
  views: array(CoordinateViewSchema)
    .optional()
    .describe('Explicit coordinate views registered by this IRPlot; ids must be unique'),
  arrangements: array(CoordinateArrangementSchema)
    .optional()
    .describe('Facet and shared-track arrangements that derive additional coordinate views'),
  spacing: CompositionSpacingSchema.optional().describe('Composition-level spacing configuration'),
  resolve: CompositionResolveSchema.optional().describe('Composition-level scale, axis, and grid resolution policy'),
})
  .superRefine((composition, ctx) => {
    const ids = new Set<string>();
    const views = composition.views ?? [];
    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      if (ids.has(view.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['views', index, 'id'],
          message: `duplicate coordinate view id "${view.id}"`,
        });
      }
      ids.add(view.id);
    }
    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      if (view.placement?.kind === CoordinateViewPlacementKind.Overlay && !ids.has(view.placement.target)) {
        ctx.addIssue({
          code: 'custom',
          path: ['views', index, 'placement', 'target'],
          message: `overlay target "${view.placement.target}" does not reference a registered coordinate view`,
        });
      }
      if (view.placement?.kind === CoordinateViewPlacementKind.Overlay && view.placement.target === view.id) {
        ctx.addIssue({
          code: 'custom',
          path: ['views', index, 'placement', 'target'],
          message: `overlay target "${view.placement.target}" cannot reference the same coordinate view`,
        });
      }
    }
    const overlayTargetOf = new Map(
      views.flatMap(view =>
        view.placement?.kind === CoordinateViewPlacementKind.Overlay ? [[view.id, view.placement.target] as const] : [],
      ),
    );
    for (const view of views) {
      const visiting = new Set<string>();
      let current: string | undefined = view.id;
      while (current !== undefined) {
        if (visiting.has(current)) {
          const index = views.findIndex(candidate => candidate.id === view.id);
          ctx.addIssue({
            code: 'custom',
            path: ['views', index, 'placement'],
            message: `overlay placement cycle detected at coordinate view "${current}"`,
          });
          break;
        }
        visiting.add(current);
        current = overlayTargetOf.get(current);
      }
    }
    const arrangementIds = new Set<string>();
    const registeredViewIds = new Set(ids);
    const arrangementKinds = new Set((composition.arrangements ?? []).map(arrangement => arrangement.kind));
    if (
      arrangementKinds.has(CoordinateArrangementKind.Facet) &&
      arrangementKinds.has(CoordinateArrangementKind.Tracks)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['arrangements'],
        message: 'composition cannot mix facet and track arrangements in the same plot',
      });
    }
    composition.arrangements?.forEach((arrangement, arrangementIndex) => {
      if (arrangementIds.has(arrangement.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['arrangements', arrangementIndex, 'id'],
          message: `duplicate arrangement id "${arrangement.id}"`,
        });
      }
      arrangementIds.add(arrangement.id);
      if (ids.has(arrangement.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['arrangements', arrangementIndex, 'id'],
          message: `arrangement id "${arrangement.id}" conflicts with a registered coordinate view id`,
        });
      }
      if (arrangement.kind === CoordinateArrangementKind.Facet && !ids.has(arrangement.view)) {
        ctx.addIssue({
          code: 'custom',
          path: ['arrangements', arrangementIndex, 'view'],
          message: `facet view "${arrangement.view}" does not reference a registered coordinate view`,
        });
      }
      if (arrangement.kind === CoordinateArrangementKind.Tracks) {
        if (arrangement.sharedRoles.length === 0 && arrangement.frame === ScaffoldFrameMode.Independent) {
          ctx.addIssue({
            code: 'custom',
            path: ['arrangements', arrangementIndex, 'sharedRoles'],
            message: `tracks arrangement "${arrangement.id}" with independent frame must declare at least one shared role`,
          });
        }
        const trackIds = new Set<string>();
        const tracksByRole = new Map<string, Array<(typeof arrangement.tracks)[number]>>();
        arrangement.tracks.forEach((track, trackIndex) => {
          const trackView =
            track.view ??
            (arrangement.viewIdTemplate ?? '{arrangement}.track.{track}')
              .replaceAll('{arrangement}', arrangement.id)
              .replaceAll('{track}', track.id);
          if (registeredViewIds.has(trackView)) {
            ctx.addIssue({
              code: 'custom',
              path: ['arrangements', arrangementIndex, 'tracks', trackIndex, 'view'],
              message: `track view id "${trackView}" conflicts with another coordinate view id`,
            });
          }
          registeredViewIds.add(trackView);
          if (trackIds.has(track.id)) {
            ctx.addIssue({
              code: 'custom',
              path: ['arrangements', arrangementIndex, 'tracks', trackIndex, 'id'],
              message: `duplicate track id "${track.id}" in arrangement "${arrangement.id}"`,
            });
          }
          trackIds.add(track.id);
          if (track.band.start >= track.band.end) {
            ctx.addIssue({
              code: 'custom',
              path: ['arrangements', arrangementIndex, 'tracks', trackIndex, 'band'],
              message: `track "${track.id}" band start must be less than end`,
            });
          }
          if (arrangement.sharedRoles.includes(track.band.role)) {
            ctx.addIssue({
              code: 'custom',
              path: ['arrangements', arrangementIndex, 'tracks', trackIndex, 'band', 'role'],
              message: `track "${track.id}" band role "${track.band.role}" must not appear in sharedRoles`,
            });
          }
          const roleTracks = tracksByRole.get(track.band.role) ?? [];
          roleTracks.push(track);
          tracksByRole.set(track.band.role, roleTracks);
        });
        for (const [role, tracks] of tracksByRole) {
          const sorted = [...tracks].sort((a, b) => a.band.start - b.band.start || a.band.end - b.band.end);
          for (let trackIndex = 1; trackIndex < sorted.length; trackIndex += 1) {
            const previous = sorted[trackIndex - 1];
            const current = sorted[trackIndex];
            if (current.band.start < previous.band.end) {
              ctx.addIssue({
                code: 'custom',
                path: ['arrangements', arrangementIndex, 'tracks'],
                message: `tracks "${previous.id}" and "${current.id}" overlap on band role "${role}"`,
              });
            }
          }
        }
      }
    });
    if (registeredViewIds.size === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['views'],
        message: 'composition requires at least one explicit or arrangement-derived coordinate view',
      });
    }
    if (!registeredViewIds.has(composition.defaultView)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultView'],
        message: `defaultView "${composition.defaultView}" does not reference a registered coordinate view`,
      });
    }
  })
  .describe('Plot-level coordinate view registry used by marks and axis guides');

export const PlotSchema = CompositeBaseSchema.extend({
  namespace: literal(PLOT_NAMESPACE).describe(
    'Tier 2 domain namespace; routes this node to the plot lowering registered via CompileOptions.composites',
  ),
  type: literal(PlotComposite.Plot).describe(
    'Composite type within the plot namespace: the top-level grammar-of-graphics spec node',
  ),
  id: NonBlankStringSchema.optional().describe('Optional plot handle used as the outer scope id and anchor target'),
  data: DataReferenceSchema.describe(
    'Data binding: a named reference to an externally-supplied dataset plus an optional data model. The dataset values never enter the IR; they are injected at compile time via lowerPlots(datasets).',
  ),
  transform: array(TransformSchema)
    .optional()
    .describe(
      'Ordered data-transform operation pipeline applied to the bound dataset before scale inference and mark lowering; omit for no transform',
    ),
  scales: array(ScaleOperationSchema).describe(
    'Named scale ops; built-ins are statically validated, custom types are validated at lowering against runtime scale definitions. Referenced by coordinate roles and non-positional channels by name',
  ),
  plotThemeTokens: PlotThemeTokenOverridesSchema.optional().describe(
    'Sparse canonical Plot theme token overrides applied after the Plot style baseline and before plotTheme',
  ),
  plotThemeTokenRules: PlotAxisThemeTokenRulesSchema.optional().describe(
    'Ordered Axis dimension rules applied after Plot theme token overrides and before plotTheme',
  ),
  plotTheme: PlotThemeSchema.optional().describe(
    'JSON-safe plot theme for background, typography, axis, legend, and palette defaults; consumed during lowering and never passed through as opaque core IR',
  ),
  width: PositiveNumberSchema.optional().describe(
    "The panel's intrinsic width in user units, used as the plot area sizing basis when this node is composed alongside others. Omit to fall back to the lowerPlots global width, then the built-in default.",
  ),
  height: PositiveNumberSchema.optional().describe(
    "The panel's intrinsic height in user units, used as the plot area sizing basis when this node is composed alongside others. Omit to fall back to the lowerPlots global height, then the built-in default.",
  ),
  coordinate: CoordinateOperationSchema.optional().describe(
    'Single-coordinate shorthand; required when composition is omitted and forbidden when composition is present',
  ),
  composition: CoordinateCompositionSchema.optional().describe(
    'Coordinate composition registry for Plot-internal coordinate views referenced by marks and axis guides',
  ),
  marks: array(MarkOperationSchema)
    .min(1)
    .describe(
      'Mark layers, drawn in array order (stable z-order); built-in mark configs or custom type open config validated by a runtime MarkDefinition',
    ),
  guides: array(GuideSchema)
    .optional()
    .describe(
      'Guide layers (axes, each with optional grid lines), derived from scales + coordinate; omit for no guides. Grid lines draw behind marks; axis lines / ticks / labels around the plot area.',
    ),
  meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable source metadata copied into core IR meta'),
})
  .superRefine((spec, ctx) => {
    const scaleNames = new Set<string>();
    spec.scales.forEach((scale, index) => {
      if (scaleNames.has(scale.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scales', index, 'name'],
          message: `scale name "${scale.name}" must be unique within a plot`,
        });
      }
      scaleNames.add(scale.name);
    });
    if (spec.coordinate === undefined && spec.composition === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['coordinate'],
        message: 'IRPlot requires either coordinate shorthand or composition',
      });
    }
    if (spec.coordinate !== undefined && spec.composition !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['composition'],
        message: 'IRPlot cannot use coordinate shorthand and composition together',
      });
    }
    const viewIds =
      spec.composition !== undefined
        ? new Set([
            ...(spec.composition.views ?? []).map(view => view.id),
            ...(spec.composition.arrangements ?? []).flatMap(arrangement =>
              arrangement.kind === CoordinateArrangementKind.Tracks
                ? arrangement.tracks.map(
                    track =>
                      track.view ??
                      (arrangement.viewIdTemplate ?? '{arrangement}.track.{track}')
                        .replaceAll('{arrangement}', arrangement.id)
                        .replaceAll('{track}', track.id),
                  )
                : [],
            ),
          ])
        : new Set(['default']);
    spec.marks.forEach((mark, index) => {
      if (mark.coordinateView !== undefined && !viewIds.has(mark.coordinateView)) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks', index, 'coordinateView'],
          message: `coordinateView "${mark.coordinateView}" does not reference a registered coordinate view`,
        });
      }
    });
    spec.guides?.forEach((guide, index) => {
      if (guide.type !== 'axis') return;
      if (guide.coordinateView !== undefined && !viewIds.has(guide.coordinateView)) {
        ctx.addIssue({
          code: 'custom',
          path: ['guides', index, 'coordinateView'],
          message: `coordinateView "${guide.coordinateView}" does not reference a registered coordinate view`,
        });
      }
    });
  })
  .describe(
    'Plot IR root: a JSON-serializable, data-free grammar-of-graphics composite node (namespace "plot"); bound to external data and lowered to core Scope/Node/Path/Step/Coordinate at compile time via lowerPlots',
  );
