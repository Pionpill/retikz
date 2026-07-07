import { CompositeBaseSchema, JsonObjectSchema } from '@retikz/core';
import { DataRefSchema } from '@retikz/data';
import { z } from 'zod';

import { CoordinateOperationSchema } from '../coordinate';
import { GuideSchema } from '../guide';
import { BoxPaddingSchema, PlotLabelSchema, PlotLayoutSchema } from '../layout';
import { MarkOperationSchema } from '../mark';
import { ScaleOperationSchema } from '../scale';
import { PlotThemeSchema } from '../theme';
import { TransformSchema } from '../transform';
import {
  CompositionAxisResolve,
  CompositionGridResolve,
  CompositionScaleResolve,
  FacetEmptyPolicy,
  PLOT_NAMESPACE,
  PlotComposite,
  ScaffoldFrameMode,
} from './constants';

export const CompositionSpacingSchema = z
  .object({
    panelGap: z.number().nonnegative().optional().describe('Gap between generated facet panels in user units'),
    trackGap: z.number().nonnegative().optional().describe('Gap between tracks in a track arrangement in user units'),
    axisGap: z.number().nonnegative().optional().describe('Outward gap between axes that share the same side or edge'),
    labelGap: z
      .number()
      .nonnegative()
      .optional()
      .describe('Gap between panel, track, or axis title labels and their related plot area'),
    padding: BoxPaddingSchema.optional().describe('Optional outer padding applied to composition frame calculation'),
  })
  .strict()
  .describe('Plot composition spacing configuration');

export const CompositionResolveSchema = z
  .object({
    scale: z
      .record(z.string().min(1), z.enum(CompositionScaleResolve))
      .optional()
      .describe('Per-coordinate-role scale resolution mode'),
    axis: z
      .record(z.string().min(1), z.enum(CompositionAxisResolve))
      .optional()
      .describe('Per-coordinate-role axis rendering mode'),
    grid: z
      .record(z.string().min(1), z.enum(CompositionGridResolve))
      .optional()
      .describe('Per-coordinate-role default grid projection mode'),
  })
  .strict()
  .describe('Composition-level scale, axis, and grid resolution policy');

const CoordinateViewRootPlacementSchema = z
  .object({
    kind: z.literal('root').describe('Placement kind: this view occupies the root plot area'),
  })
  .strict()
  .describe('Root coordinate view placement');

const CoordinateViewSlotPlacementSchema = z
  .object({
    kind: z.literal('slot').describe('Placement kind: this view occupies a named arrangement slot'),
    arrangement: z.string().min(1).describe('Arrangement id that owns this slot'),
    slot: z.string().min(1).describe('Slot key this view occupies inside the arrangement'),
  })
  .strict()
  .describe('Arrangement slot coordinate view placement');

const CoordinateViewOverlayPlacementSchema = z
  .object({
    kind: z.literal('overlay').describe('Placement kind: this view overlays another coordinate view'),
    target: z.string().min(1).describe('Target coordinate view id this view overlays'),
    zIndex: z
      .number()
      .optional()
      .describe('Relative mark-layer z-order hint inside the shared overlay panel; omit to use view declaration order'),
  })
  .strict()
  .describe('Overlay coordinate view placement');

export const CoordinateViewPlacementSchema = z
  .discriminatedUnion('kind', [
    CoordinateViewRootPlacementSchema,
    CoordinateViewSlotPlacementSchema,
    CoordinateViewOverlayPlacementSchema,
  ])
  .describe('Coordinate view placement kind and payload');

export const CoordinateViewSchema = z
  .object({
    id: z.string().min(1).describe('Stable coordinate view id referenced by marks and axis guides'),
    coordinate: CoordinateOperationSchema.describe('Coordinate operation owned by this view'),
    placement: CoordinateViewPlacementSchema.optional().describe(
      'Optional placement of this coordinate view in the plot composition; omit means root placement during normalization',
    ),
    meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable metadata for this coordinate view'),
  })
  .strict()
  .describe('Coordinate view registered inside a plot composition');

const FacetValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('JSON-safe scalar facet value used in facet ordering and panel keys');

const FacetDimensionSchema = z
  .object({
    field: z.string().min(1).describe('Data field path used to split rows into facet panels'),
    order: z
      .array(FacetValueSchema)
      .optional()
      .describe('Explicit facet value order; values not listed are appended in first-seen order'),
  })
  .strict()
  .describe('Facet dimension bound to a data field');

const FacetDimensionInputSchema = z
  .union([FacetDimensionSchema, z.array(FacetDimensionSchema).min(1)])
  .describe('One or more facet dimensions bound to data fields');

const FacetHeaderSchema = z
  .object({
    row: z.boolean().optional().describe('Whether generated row labels are visible'),
    column: z.boolean().optional().describe('Whether generated column labels are visible'),
  })
  .strict()
  .describe('Facet header visibility');

export const FacetArrangementSchema = z
  .object({
    kind: z.literal('facet').describe('Arrangement discriminator: data-driven facet panels'),
    id: z.string().min(1).describe('Stable facet arrangement id used to derive panel view ids and provenance'),
    view: z.string().min(1).describe('Template coordinate view used by generated facet panels'),
    row: FacetDimensionInputSchema.optional().describe(
      'Facet row dimension or ordered row-dimension hierarchy; omit for a one-dimensional column facet',
    ),
    column: FacetDimensionInputSchema.optional().describe(
      'Facet column dimension or ordered column-dimension hierarchy; omit for a one-dimensional row facet',
    ),
    empty: z
      .enum(FacetEmptyPolicy)
      .optional()
      .describe('Empty-panel policy; omit to drop row/column combinations that have no rows'),
    header: FacetHeaderSchema.optional().describe('Facet row and column label visibility'),
    resolve: CompositionResolveSchema.optional().describe('Facet-local scale, axis, and grid resolution policy'),
    spacing: CompositionSpacingSchema.optional().describe('Facet-local spacing override'),
    coordinate: CoordinateOperationSchema.optional().describe(
      'Coordinate operation used by every generated panel; omit to inherit the template view coordinate',
    ),
    viewIdTemplate: z
      .string()
      .min(1)
      .optional()
      .describe('Panel view id template supporting {arrangement}, {row}, {column}, and {panel} placeholders'),
  })
  .strict()
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

const ScaffoldTrackBandSchema = z
  .object({
    role: z.string().min(1).describe('Coordinate role localized into this track band'),
    start: z.number().min(0).max(1).describe('Track band start fraction in arrangement-local coordinates'),
    end: z.number().min(0).max(1).describe('Track band end fraction in arrangement-local coordinates'),
  })
  .strict()
  .describe('Fractional role band occupied by one track arrangement lane');

export const TrackArrangementTrackSchema = z
  .object({
    id: z.string().min(1).describe('Stable track id within its track arrangement'),
    view: z.string().min(1).optional().describe('Explicit coordinate view id for this track; omit to derive one'),
    band: ScaffoldTrackBandSchema.describe('Local role band assigned to this track'),
    order: z.number().optional().describe('Optional track ordering hint; omit to use declaration order'),
    coordinate: CoordinateOperationSchema.optional().describe('Coordinate override for this track view'),
    header: z.boolean().optional().describe('Whether this track label is visible'),
  })
  .strict()
  .describe('Track registered under a shared track arrangement');

const TrackHeaderSchema = z
  .object({
    track: z.boolean().optional().describe('Whether generated track labels are visible'),
  })
  .strict()
  .describe('Track arrangement header visibility');

export const TrackArrangementSchema = z
  .object({
    kind: z.literal('tracks').describe('Arrangement discriminator: shared coordinate tracks'),
    id: z.string().min(1).describe('Stable track arrangement id used to derive track view ids and provenance'),
    coordinate: CoordinateOperationSchema.describe('Base coordinate operation owned by this track arrangement'),
    sharedRoles: z
      .array(z.string().min(1))
      .describe('Coordinate roles whose scale domain and range are shared across tracks'),
    frame: z
      .enum(ScaffoldFrameMode)
      .optional()
      .describe('Frame sharing mode for track views; omit to share the track arrangement frame'),
    tracks: z.array(TrackArrangementTrackSchema).min(1).describe('Tracks mounted in this arrangement'),
    header: TrackHeaderSchema.optional().describe('Track label visibility'),
    resolve: CompositionResolveSchema.optional().describe('Track-local scale, axis, and grid resolution policy'),
    spacing: CompositionSpacingSchema.optional().describe('Track-local spacing override'),
    viewIdTemplate: z
      .string()
      .min(1)
      .optional()
      .describe('Track view id template supporting {arrangement} and {track} placeholders'),
  })
  .strict()
  .describe('Shared track arrangement that derives coordinate views for tracks');

export const CoordinateArrangementSchema = z
  .discriminatedUnion('kind', [FacetArrangementSchema, TrackArrangementSchema])
  .describe('Coordinate arrangement generator for facets or shared tracks');

export const CoordinateCompositionSchema = z
  .object({
    defaultView: z
      .string()
      .min(1)
      .describe('Coordinate view id used when a mark or axis guide omits coordinateView'),
    views: z
      .array(CoordinateViewSchema)
      .optional()
      .describe('Explicit coordinate views registered by this PlotSpec; ids must be unique'),
    arrangements: z
      .array(CoordinateArrangementSchema)
      .optional()
      .describe('Facet and shared-track arrangements that derive additional coordinate views'),
    spacing: CompositionSpacingSchema.optional().describe('Composition-level spacing configuration'),
    resolve: CompositionResolveSchema.optional().describe('Composition-level scale, axis, and grid resolution policy'),
  })
  .strict()
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
      if (view.placement?.kind === 'overlay' && !ids.has(view.placement.target)) {
        ctx.addIssue({
          code: 'custom',
          path: ['views', index, 'placement', 'target'],
          message: `overlay target "${view.placement.target}" does not reference a registered coordinate view`,
        });
      }
      if (view.placement?.kind === 'overlay' && view.placement.target === view.id) {
        ctx.addIssue({
          code: 'custom',
          path: ['views', index, 'placement', 'target'],
          message: `overlay target "${view.placement.target}" cannot reference the same coordinate view`,
        });
      }
    }
    const overlayTargetOf = new Map(
      views.flatMap(view =>
        view.placement?.kind === 'overlay' ? [[view.id, view.placement.target] as const] : [],
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
    if (arrangementKinds.has('facet') && arrangementKinds.has('tracks')) {
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
      if (arrangement.kind === 'facet' && !ids.has(arrangement.view)) {
        ctx.addIssue({
          code: 'custom',
          path: ['arrangements', arrangementIndex, 'view'],
          message: `facet view "${arrangement.view}" does not reference a registered coordinate view`,
        });
      }
      if (arrangement.kind === 'tracks') {
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

export const PlotSpecSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(PLOT_NAMESPACE)
    .describe(
      'Tier 2 domain namespace; routes this node to the plot lowering registered via CompileOptions.composites',
    ),
  type: z
    .literal(PlotComposite.Plot)
    .describe('Composite type within the plot namespace: the top-level grammar-of-graphics spec node'),
  id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional plot handle used as the outer scope id and anchor target'),
  data: DataRefSchema.describe(
    'Data binding: a named reference to an externally-supplied dataset plus an optional data model. The dataset values never enter the IR; they are injected at compile time via lowerPlots(datasets).',
  ),
  transform: z
    .array(TransformSchema)
    .optional()
    .describe(
      'Ordered data-transform operation pipeline applied to the bound dataset before scale inference and mark lowering; omit for no transform',
    ),
  scales: z
    .array(ScaleOperationSchema)
    .describe(
      'Named scale ops; built-ins are statically validated, custom types are validated at lowering against runtime scale definitions. Referenced by coordinate roles and non-positional channels by name',
    ),
  colors: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Compatibility shorthand for theme.palette.categorical/series/sector; omit to use the built-in palette. Explicit theme.palette slots and explicit scale range/scheme have higher priority. Use "currentColor" to keep the inherited core color.',
    ),
  theme: PlotThemeSchema.optional().describe(
    'JSON-safe plot theme for background, typography, axis, legend, and palette defaults; consumed during lowering and never passed through as opaque core IR',
  ),
  layout: PlotLayoutSchema.optional().describe(
    'Plot-level label layout strategy for titles, captions, legends, and guide reservations',
  ),
  labels: z
    .array(PlotLabelSchema)
    .optional()
    .describe('Static plot labels such as titles, captions, source notes, and custom text'),
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
  coordinate: CoordinateOperationSchema.optional().describe(
    'Single-coordinate shorthand; required when composition is omitted and forbidden when composition is present',
  ),
  composition: CoordinateCompositionSchema.optional().describe(
    'Coordinate composition registry for Plot-internal coordinate views referenced by marks and axis guides',
  ),
  marks: z
    .array(MarkOperationSchema)
    .min(1)
    .describe(
      'Mark layers, drawn in array order (stable z-order); built-in mark configs or custom type passthrough validated by a runtime MarkDefinition',
    ),
  guides: z
    .array(GuideSchema)
    .optional()
    .describe(
      'Guide layers (axes, each with optional grid lines), derived from scales + coordinate; omit for no guides. Grid lines draw behind marks; axis lines / ticks / labels around the plot area.',
    ),
  meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable source metadata copied into core IR meta'),
})
  .superRefine((spec, ctx) => {
    if (spec.coordinate === undefined && spec.composition === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['coordinate'],
        message: 'PlotSpec requires either coordinate shorthand or composition',
      });
    }
    if (spec.coordinate !== undefined && spec.composition !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['composition'],
        message: 'PlotSpec cannot use coordinate shorthand and composition together',
      });
    }
    const viewIds =
      spec.composition !== undefined
        ? new Set([
            ...(spec.composition.views ?? []).map(view => view.id),
            ...(spec.composition.arrangements ?? []).flatMap(arrangement =>
              arrangement.kind === 'tracks'
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
