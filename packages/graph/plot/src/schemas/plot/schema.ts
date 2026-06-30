import { CompositeBaseSchema, JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';

import { CoordinateOperationSchema } from '../coordinate';
import { DataRefSchema } from '../data';
import { GuideSchema } from '../guide';
import { MarkOperationSchema } from '../mark';
import { ScaleOperationSchema } from '../scale';
import { TransformSchema } from '../transform';
import {
  CompositionAxisPolicy,
  CompositionFacetLabelPolicy,
  CompositionGridPlacement,
  CompositionTrackLabelPolicy,
  FacetEmptyPolicy,
  FacetScaleSharing,
  PLOT_NAMESPACE,
  PlotComposite,
  ScaffoldFrameMode,
} from './constants';

const BoxPaddingSchema = z
  .object({
    top: z.number().nonnegative().optional().describe('Top composition padding in user units'),
    right: z.number().nonnegative().optional().describe('Right composition padding in user units'),
    bottom: z.number().nonnegative().optional().describe('Bottom composition padding in user units'),
    left: z.number().nonnegative().optional().describe('Left composition padding in user units'),
  })
  .strict()
  .describe('Optional per-side padding around a coordinate composition');

export const CompositionLayoutSchema = z
  .object({
    panelGap: z.number().nonnegative().optional().describe('Gap between generated facet panels in user units'),
    trackGap: z.number().nonnegative().optional().describe('Gap between scaffold tracks in user units'),
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

export const CompositionGuidePolicySchema = z
  .object({
    axes: z
      .enum(CompositionAxisPolicy)
      .optional()
      .describe('Axis rendering policy for multi-scope compositions; omit to use composition-type defaults'),
    gridPlacement: z
      .enum(CompositionGridPlacement)
      .optional()
      .describe('Default target placement for axis grids in multi-scope compositions; omit to use composition-type defaults'),
    facetLabels: z
      .enum(CompositionFacetLabelPolicy)
      .optional()
      .describe('Facet label rendering policy for generated panels'),
    trackLabels: z
      .enum(CompositionTrackLabelPolicy)
      .optional()
      .describe('Track label rendering policy for shared scaffold tracks'),
  })
  .strict()
  .describe('Plot composition guide rendering policy');

const CoordinateScopeRootPlacementSchema = z
  .object({
    kind: z.literal('root').describe('Placement kind: this scope occupies the root plot area'),
  })
  .strict()
  .describe('Root coordinate scope placement');

const CoordinateScopePanelPlacementSchema = z
  .object({
    kind: z.literal('panel').describe('Placement kind: this scope occupies a named panel slot'),
    slot: z.string().min(1).optional().describe('Panel slot key this scope occupies'),
  })
  .strict()
  .describe('Panel coordinate scope placement');

const CoordinateScopeOverlayPlacementSchema = z
  .object({
    kind: z.literal('overlay').describe('Placement kind: this scope overlays another coordinate scope'),
    target: z.string().min(1).describe('Target coordinate scope id this scope overlays'),
    zIndex: z
      .number()
      .optional()
      .describe('Relative mark-layer z-order hint inside the shared overlay panel; omit to use scope declaration order'),
  })
  .strict()
  .describe('Overlay coordinate scope placement');

const CoordinateScopeTrackPlacementSchema = z
  .object({
    kind: z.literal('track').describe('Placement kind: this scope occupies a track on a shared scaffold'),
    scaffold: z.string().min(1).describe('Shared scaffold id this track belongs to'),
    track: z.string().min(1).describe('Track id within the shared scaffold'),
  })
  .strict()
  .describe('Track coordinate scope placement');

export const CoordinateScopePlacementSchema = z
  .discriminatedUnion('kind', [
    CoordinateScopeRootPlacementSchema,
    CoordinateScopePanelPlacementSchema,
    CoordinateScopeOverlayPlacementSchema,
    CoordinateScopeTrackPlacementSchema,
  ])
  .describe('Coordinate scope placement kind and payload');

export const CoordinateScopeSchema = z
  .object({
    id: z.string().min(1).describe('Stable coordinate scope id referenced by marks and axis guides'),
    coordinate: CoordinateOperationSchema.optional().describe(
      'Coordinate operation owned by this scope; track scopes may omit it to inherit their scaffold coordinate',
    ),
    placement: CoordinateScopePlacementSchema.optional().describe(
      'Optional placement of this coordinate scope in the plot composition; omit means root placement during normalization',
    ),
    meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable metadata for this coordinate scope'),
  })
  .strict()
  .describe('Coordinate scope registered inside a plot composition');

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

const FacetScaleSharingSchema = z
  .object({
    roles: z
      .record(z.string().min(1), z.enum(FacetScaleSharing))
      .optional()
      .describe('Per-coordinate-role scale domain sharing mode; omitted roles default to shared'),
  })
  .strict()
  .describe('Facet position-role scale sharing policy');

export const FacetGridSchema = z
  .object({
    id: z.string().min(1).describe('Stable facet grid id used to derive panel scope ids and provenance'),
    row: FacetDimensionSchema.optional().describe('Facet row dimension; omit for a one-dimensional column facet'),
    column: FacetDimensionSchema.optional().describe(
      'Facet column dimension; omit for a one-dimensional row facet',
    ),
    empty: z
      .enum(FacetEmptyPolicy)
      .optional()
      .describe('Empty-panel policy; omit to drop row/column combinations that have no rows'),
    scales: FacetScaleSharingSchema.optional().describe(
      'Position-role scale sharing policy for generated facet panels',
    ),
    coordinate: CoordinateOperationSchema.optional().describe(
      'Coordinate operation used by every generated panel; omit to inherit the composition default scope coordinate',
    ),
    scopeIdTemplate: z
      .string()
      .min(1)
      .optional()
      .describe('Panel scope id template supporting {facet}, {row}, and {column} placeholders'),
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
  .describe('Facet grid generator that derives panel coordinate scopes from data rows');

const ScaffoldTrackBandSchema = z
  .object({
    role: z.string().min(1).describe('Coordinate role localized into this track band'),
    start: z.number().min(0).max(1).describe('Track band start fraction in scaffold-local coordinates'),
    end: z.number().min(0).max(1).describe('Track band end fraction in scaffold-local coordinates'),
  })
  .strict()
  .describe('Fractional role band occupied by one scaffold track');

export const ScaffoldTrackSchema = z
  .object({
    id: z.string().min(1).describe('Stable track id referenced by coordinate scope placement'),
    band: ScaffoldTrackBandSchema.describe('Local role band assigned to this track'),
    order: z.number().optional().describe('Optional track ordering hint; omit to use declaration order'),
  })
  .strict()
  .describe('Track registered under a shared coordinate scaffold');

export const SharedScaffoldSchema = z
  .object({
    id: z.string().min(1).describe('Stable scaffold id referenced by track scope placement'),
    coordinate: CoordinateOperationSchema.describe('Base coordinate operation owned by this scaffold'),
    sharedRoles: z
      .array(z.string().min(1))
      .describe('Coordinate roles whose scale domain and range are managed by the scaffold'),
    frame: z
      .enum(ScaffoldFrameMode)
      .optional()
      .describe('Frame sharing mode for track scopes; omit to share the scaffold frame'),
    tracks: z.array(ScaffoldTrackSchema).min(1).describe('Tracks mounted on this scaffold'),
  })
  .strict()
  .describe('Shared coordinate scaffold registry entry');

export const CoordinateCompositionSchema = z
  .object({
    defaultScope: z
      .string()
      .min(1)
      .describe('Coordinate scope id used when a mark or axis guide omits coordinateScope'),
    scopes: z
      .array(CoordinateScopeSchema)
      .min(1)
      .describe('Coordinate scopes registered by this PlotSpec; ids must be unique'),
    facets: z
      .array(FacetGridSchema)
      .optional()
      .describe('Facet grid generators that derive panel coordinate scopes from data rows'),
    scaffolds: z
      .array(SharedScaffoldSchema)
      .optional()
      .describe('Shared coordinate scaffolds that provide track bands for coordinate scopes'),
    layout: CompositionLayoutSchema.optional().describe('Composition-level spacing configuration'),
    guidePolicy: CompositionGuidePolicySchema.optional().describe('Composition-level guide rendering policy'),
  })
  .strict()
  .superRefine((composition, ctx) => {
    const ids = new Set<string>();
    for (let index = 0; index < composition.scopes.length; index += 1) {
      const scope = composition.scopes[index];
      if (ids.has(scope.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scopes', index, 'id'],
          message: `duplicate coordinate scope id "${scope.id}"`,
        });
      }
      ids.add(scope.id);
    }
    const scaffoldById = new Map<string, NonNullable<typeof composition.scaffolds>[number]>();
    composition.scaffolds?.forEach((scaffold, scaffoldIndex) => {
      if (scaffoldById.has(scaffold.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scaffolds', scaffoldIndex, 'id'],
          message: `duplicate scaffold id "${scaffold.id}"`,
        });
      }
      scaffoldById.set(scaffold.id, scaffold);
      if (scaffold.sharedRoles.length === 0 && scaffold.frame === ScaffoldFrameMode.Independent) {
        ctx.addIssue({
          code: 'custom',
          path: ['scaffolds', scaffoldIndex, 'sharedRoles'],
          message: `scaffold "${scaffold.id}" with independent frame must declare at least one shared role`,
        });
      }
      const trackIds = new Set<string>();
      const tracksByRole = new Map<string, Array<(typeof scaffold.tracks)[number]>>();
      scaffold.tracks.forEach((track, trackIndex) => {
        if (trackIds.has(track.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['scaffolds', scaffoldIndex, 'tracks', trackIndex, 'id'],
            message: `duplicate track id "${track.id}" in scaffold "${scaffold.id}"`,
          });
        }
        trackIds.add(track.id);
        if (track.band.start >= track.band.end) {
          ctx.addIssue({
            code: 'custom',
            path: ['scaffolds', scaffoldIndex, 'tracks', trackIndex, 'band'],
            message: `track "${track.id}" band start must be less than end`,
          });
        }
        if (scaffold.sharedRoles.includes(track.band.role)) {
          ctx.addIssue({
            code: 'custom',
            path: ['scaffolds', scaffoldIndex, 'tracks', trackIndex, 'band', 'role'],
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
              path: ['scaffolds', scaffoldIndex, 'tracks'],
              message: `tracks "${previous.id}" and "${current.id}" overlap on band role "${role}"`,
            });
          }
        }
      }
    });
    if (!ids.has(composition.defaultScope)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultScope'],
        message: `defaultScope "${composition.defaultScope}" does not reference a registered coordinate scope`,
      });
    }
    for (let index = 0; index < composition.scopes.length; index += 1) {
      const scope = composition.scopes[index];
      if (scope.placement?.kind !== 'track' && scope.coordinate === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['scopes', index, 'coordinate'],
          message: `coordinate scope "${scope.id}" must declare coordinate unless it is mounted on a scaffold track`,
        });
      }
      if (scope.placement?.kind === 'overlay' && !ids.has(scope.placement.target)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scopes', index, 'placement', 'target'],
          message: `overlay target "${scope.placement.target}" does not reference a registered coordinate scope`,
        });
      }
      if (scope.placement?.kind === 'overlay' && scope.placement.target === scope.id) {
        ctx.addIssue({
          code: 'custom',
          path: ['scopes', index, 'placement', 'target'],
          message: `overlay target "${scope.placement.target}" cannot reference the same coordinate scope`,
        });
      }
      if (scope.placement?.kind === 'track') {
        const placement = scope.placement;
        const scaffold = scaffoldById.get(placement.scaffold);
        if (scaffold === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['scopes', index, 'placement', 'scaffold'],
            message: `track placement scaffold "${placement.scaffold}" does not reference a registered scaffold`,
          });
        } else if (!scaffold.tracks.some(track => track.id === placement.track)) {
          ctx.addIssue({
            code: 'custom',
            path: ['scopes', index, 'placement', 'track'],
            message: `track placement track "${placement.track}" does not reference a track on scaffold "${placement.scaffold}"`,
          });
        }
      }
    }
    const overlayTargetOf = new Map(
      composition.scopes.flatMap(scope =>
        scope.placement?.kind === 'overlay' ? [[scope.id, scope.placement.target] as const] : [],
      ),
    );
    for (const scope of composition.scopes) {
      const visiting = new Set<string>();
      let current: string | undefined = scope.id;
      while (current !== undefined) {
        if (visiting.has(current)) {
          const index = composition.scopes.findIndex(candidate => candidate.id === scope.id);
          ctx.addIssue({
            code: 'custom',
            path: ['scopes', index, 'placement'],
            message: `overlay placement cycle detected at coordinate scope "${current}"`,
          });
          break;
        }
        visiting.add(current);
        current = overlayTargetOf.get(current);
      }
    }
    const facetIds = new Set<string>();
    composition.facets?.forEach((facet, index) => {
      if (facetIds.has(facet.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['facets', index, 'id'],
          message: `duplicate facet id "${facet.id}"`,
        });
      }
      facetIds.add(facet.id);
      if (ids.has(facet.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['facets', index, 'id'],
          message: `facet id "${facet.id}" conflicts with a registered coordinate scope id`,
        });
      }
    });
  })
  .describe('Plot-level coordinate scope registry used by marks and axis guides');

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
  coordinate: CoordinateOperationSchema.optional().describe(
    'Single-coordinate shorthand; required when composition is omitted and forbidden when composition is present',
  ),
  composition: CoordinateCompositionSchema.optional().describe(
    'Coordinate composition registry for Plot-internal coordinate scopes referenced by marks and axis guides',
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
    const scopeIds =
      spec.composition !== undefined
        ? new Set(spec.composition.scopes.map(scope => scope.id))
        : new Set(['default']);
    spec.marks.forEach((mark, index) => {
      if (mark.coordinateScope !== undefined && !scopeIds.has(mark.coordinateScope)) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks', index, 'coordinateScope'],
          message: `coordinateScope "${mark.coordinateScope}" does not reference a registered coordinate scope`,
        });
      }
    });
    spec.guides?.forEach((guide, index) => {
      if (guide.type !== 'axis') return;
      if (guide.coordinateScope !== undefined && !scopeIds.has(guide.coordinateScope)) {
        ctx.addIssue({
          code: 'custom',
          path: ['guides', index, 'coordinateScope'],
          message: `coordinateScope "${guide.coordinateScope}" does not reference a registered coordinate scope`,
        });
      }
    });
  })
  .describe(
    'Plot IR root: a JSON-serializable, data-free grammar-of-graphics composite node (namespace "plot"); bound to external data and lowered to core Scope/Node/Path/Step/Coordinate at compile time via lowerPlots',
  );
