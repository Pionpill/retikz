import type { PlotSpec } from '../../src/schemas';

import { PlotSpecSchema } from '../../src/schemas';

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const mapGridApplyTo = (value: unknown): unknown => {
  if (value === 'self') return 'local';
  if (value === 'sharedRole') return 'all';
  return value;
};

const mapGridSelector = (selector: unknown): unknown => {
  if (!isRecord(selector)) return selector;
  const out: JsonRecord = { ...selector };
  if ('scopes' in out) {
    out.view = out.scopes;
    delete out.scopes;
  }
  if (isRecord(out.facet) && 'id' in out.facet) {
    out.facet = { ...out.facet, arrangement: out.facet.id };
    delete (out.facet as JsonRecord).id;
  }
  if (isRecord(out.track) && 'scaffold' in out.track) {
    out.track = { ...out.track, arrangement: out.track.scaffold };
    delete (out.track as JsonRecord).scaffold;
  }
  return out;
};

const migrateGuide = (guide: unknown): unknown => {
  if (!isRecord(guide)) return guide;
  const out: JsonRecord = { ...guide };
  if ('coordinateScope' in out) {
    out.coordinateView = out.coordinateScope;
    delete out.coordinateScope;
  }
  if (isRecord(out.grid)) {
    out.grid = {
      ...out.grid,
      applyTo: mapGridApplyTo(out.grid.applyTo),
      ...('select' in out.grid ? { select: mapGridSelector(out.grid.select) } : {}),
    };
  }
  return out;
};

const migrateMark = (mark: unknown): unknown => {
  if (!isRecord(mark)) return mark;
  const out: JsonRecord = { ...mark };
  if ('coordinateScope' in out) {
    out.coordinateView = out.coordinateScope;
    delete out.coordinateScope;
  }
  return out;
};

const resolveFromGuidePolicy = (policy: unknown): JsonRecord | undefined => {
  if (!isRecord(policy)) return undefined;
  const resolve: JsonRecord = {};
  if (policy.axes === 'outerShared') resolve.axis = { x: 'outer', y: 'outer' };
  if (policy.axes === 'perScope') resolve.axis = { x: 'local', y: 'local' };
  if (policy.gridPlacement === 'self') resolve.grid = { x: 'local', y: 'local' };
  if (policy.gridPlacement === 'sharedRole') resolve.grid = { x: 'all', y: 'all' };
  return Object.keys(resolve).length > 0 ? resolve : undefined;
};

const mergeResolve = (base: unknown, next: unknown): unknown => {
  if (!isRecord(base)) return next;
  if (!isRecord(next)) return base;
  return {
    ...base,
    ...next,
    scale: { ...(isRecord(base.scale) ? base.scale : {}), ...(isRecord(next.scale) ? next.scale : {}) },
    axis: { ...(isRecord(base.axis) ? base.axis : {}), ...(isRecord(next.axis) ? next.axis : {}) },
    grid: { ...(isRecord(base.grid) ? base.grid : {}), ...(isRecord(next.grid) ? next.grid : {}) },
  };
};

const migrateComposition = (composition: unknown): unknown => {
  if (!isRecord(composition)) return composition;

  const scopes = Array.isArray(composition.scopes) ? composition.scopes.filter(isRecord) : [];
  const scaffolds = Array.isArray(composition.scaffolds) ? composition.scaffolds.filter(isRecord) : [];
  const facets = Array.isArray(composition.facets) ? composition.facets.filter(isRecord) : [];
  const existingArrangements = Array.isArray(composition.arrangements) ? composition.arrangements.filter(isRecord) : [];
  const guidePolicy = composition.guidePolicy;
  const trackScopeByKey = new Map<string, JsonRecord>();

  for (const scope of scopes) {
    if (isRecord(scope.placement) && scope.placement.kind === 'track') {
      trackScopeByKey.set(`${String(scope.placement.scaffold)}\u0000${String(scope.placement.track)}`, scope);
    }
  }

  const views = scopes
    .filter(scope => !(isRecord(scope.placement) && scope.placement.kind === 'track'))
    .map(scope => {
      const out: JsonRecord = { ...scope };
      delete out.scaffold;
      delete out.track;
      return out;
    });

  const arrangements = [
    ...existingArrangements,
    ...facets.map(facet => {
      const resolve = mergeResolve(
        isRecord(facet.scales) && isRecord(facet.scales.roles) ? { scale: facet.scales.roles } : undefined,
        resolveFromGuidePolicy(guidePolicy),
      );
      const out: JsonRecord = {
        kind: 'facet',
        id: facet.id,
        view: composition.defaultScope,
        ...facet,
      };
      delete out.scales;
      delete out.scopeIdTemplate;
      if ('scopeIdTemplate' in facet) out.viewIdTemplate = facet.scopeIdTemplate;
      if (isRecord(guidePolicy) && guidePolicy.facetLabels === 'rowColumn') out.header = { row: true, column: true };
      if (resolve !== undefined) out.resolve = resolve;
      return out;
    }),
    ...scaffolds.map(scaffold => {
      const tracks = Array.isArray(scaffold.tracks)
        ? scaffold.tracks.filter(isRecord).map(track => {
            const scope = trackScopeByKey.get(`${String(scaffold.id)}\u0000${String(track.id)}`);
            return {
              ...track,
              ...(scope !== undefined ? { view: scope.id } : {}),
              ...(scope !== undefined && 'coordinate' in scope ? { coordinate: scope.coordinate } : {}),
            };
          })
        : [];
      return {
        kind: 'tracks',
        ...scaffold,
        tracks,
        ...('layout' in scaffold ? { spacing: scaffold.layout } : {}),
        ...('guidePolicy' in scaffold ? { resolve: resolveFromGuidePolicy(scaffold.guidePolicy) } : {}),
      };
    }),
  ];

  const resolve = mergeResolve(resolveFromGuidePolicy(guidePolicy), composition.resolve);
  return {
    defaultView: composition.defaultView ?? composition.defaultScope,
    ...(Array.isArray(composition.views) ? { views: composition.views } : views.length > 0 ? { views } : {}),
    ...(arrangements.length > 0 ? { arrangements } : {}),
    ...('spacing' in composition ? { spacing: composition.spacing } : 'layout' in composition ? { spacing: composition.layout } : {}),
    ...(resolve !== undefined ? { resolve } : {}),
  };
};

export const migrateCompositionSpec = (spec: unknown): unknown => {
  if (!isRecord(spec)) return spec;
  return {
    ...spec,
    ...(isRecord(spec.composition) ? { composition: migrateComposition(spec.composition) } : {}),
    ...(Array.isArray(spec.marks) ? { marks: spec.marks.map(migrateMark) } : {}),
    ...(Array.isArray(spec.guides) ? { guides: spec.guides.map(migrateGuide) } : {}),
  };
};

export const parseCompositionSpec = (spec: unknown): PlotSpec => PlotSpecSchema.parse(migrateCompositionSpec(spec));
