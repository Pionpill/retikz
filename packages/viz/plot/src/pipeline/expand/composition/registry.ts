import type { IRPlotSpec } from '../../../schemas';
import type { CoordinateScopeRegistry, CoordinateScopeRegistryEntry } from '../types';
import type { ScaffoldTrack, SharedScaffold } from './types';

import { CoordinateArrangementKind, CoordinateViewPlacementKind } from '../../../schemas';

const DEFAULT_COORDINATE_SCOPE_ID = 'default';

/** 解析 track 对应的 coordinate view id。 */
const trackViewIdOf = (arrangement: SharedScaffold, track: ScaffoldTrack): string => {
  if (track.view !== undefined) return track.view;
  const template = arrangement.viewIdTemplate ?? '{arrangement}.track.{track}';
  return template.replaceAll('{arrangement}', arrangement.id).replaceAll('{track}', track.id);
};

/** 解析 plot 的坐标简写或 composition 为统一坐标视图 registry。 */
export const resolveCoordinateScopeRegistry = (node: IRPlotSpec): CoordinateScopeRegistry => {
  if (node.composition !== undefined) {
    const scaffolds = (node.composition.arrangements ?? []).filter(
      (arrangement): arrangement is SharedScaffold => arrangement.kind === CoordinateArrangementKind.Tracks,
    );
    const explicitScopes: Array<CoordinateScopeRegistryEntry> = (node.composition.views ?? []).map(view => {
      const placement =
        view.placement === undefined || view.placement.kind !== CoordinateViewPlacementKind.Slot
          ? view.placement
          : undefined;
      return {
        id: view.id,
        coordinate: view.coordinate,
        ...(placement !== undefined ? { placement } : {}),
      };
    });
    const generatedTrackScopes: Array<CoordinateScopeRegistryEntry> = scaffolds.flatMap(scaffold =>
      scaffold.tracks.map(track => ({
        id: trackViewIdOf(scaffold, track),
        coordinate: track.coordinate ?? scaffold.coordinate,
        placement: { kind: 'track', scaffold: scaffold.id, track: track.id },
        scaffold: scaffold.id,
        track: track.id,
      })),
    );
    const seen = new Set<string>();
    for (const scope of [...explicitScopes, ...generatedTrackScopes]) {
      if (seen.has(scope.id)) throw new Error(`lowerPlots: coordinate view "${scope.id}" is duplicated`);
      seen.add(scope.id);
    }
    return {
      defaultScope: node.composition.defaultView,
      scopes: [...explicitScopes, ...generatedTrackScopes],
    };
  }
  if (node.coordinate === undefined) {
    throw new Error('lowerPlots: PlotSpec requires either coordinate shorthand or composition');
  }
  return {
    defaultScope: DEFAULT_COORDINATE_SCOPE_ID,
    scopes: [{ id: DEFAULT_COORDINATE_SCOPE_ID, coordinate: node.coordinate }],
  };
};

/** 返回图元或 guide 应路由到的坐标视图 id。 */
export const coordinateScopeIdOf = (operation: { coordinateView?: string }, defaultScope: string): string =>
  operation.coordinateView ?? defaultScope;
