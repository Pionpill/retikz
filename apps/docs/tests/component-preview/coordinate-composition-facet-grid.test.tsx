import type { FC, ReactNode } from 'react';

import { PlotAxis } from '@retikz/plot-react';
import { Children, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlValues,
  PreviewPanelControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '../../src/modules/docs/components/component-preview/controls';
import {
  COORDINATE_COMPOSITION_FACET_CONTROL_IDS,
  coordinateCompositionFacetControls,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-facet.controls';
import FacetPreview, {
  previewSource as facetPreviewSource,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-facet.demo';
import { coordinateCompositionFacetControls as englishCoordinateCompositionFacetControls } from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-facet.en.controls';
import {
  COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS,
  coordinateCompositionFacetMultilevelControls,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-facet-multilevel.controls';
import MultilevelPreview, {
  previewSource as multilevelPreviewSource,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-facet-multilevel.demo';
import { coordinateCompositionFacetMultilevelControls as englishCoordinateCompositionFacetMultilevelControls } from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-facet-multilevel.en.controls';
import {
  COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS,
  coordinateCompositionScopesControls,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-scopes.controls';
import ScopesPreview, {
  previewSource as scopesPreviewSource,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-scopes.demo';
import { coordinateCompositionScopesControls as englishCoordinateCompositionScopesControls } from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-scopes.en.controls';
import {
  COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS,
  coordinateCompositionTracksControls,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-tracks.controls';
import TracksPreview, {
  previewSource as tracksPreviewSource,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-tracks.demo';
import { coordinateCompositionTracksControls as englishCoordinateCompositionTracksControls } from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-tracks.en.controls';
import {
  COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS,
  coordinateCompositionTracksPolarControls,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-tracks-polar.controls';
import PolarTracksPreview, {
  previewSource as polarTracksPreviewSource,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-tracks-polar.demo';
import { coordinateCompositionTracksPolarControls as englishCoordinateCompositionTracksPolarControls } from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-tracks-polar.en.controls';
import {
  COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS,
  coordinateCompositionXAxisControls,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-x-axis.controls';
import XAxisPreview, {
  previewSource as xAxisPreviewSource,
} from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-x-axis.demo';
import { coordinateCompositionXAxisControls as englishCoordinateCompositionXAxisControls } from '../../src/modules/docs/contents/viz/plot/coordinate/composition/coordinate-composition-x-axis.en.controls';

type AxisGridSnapshot = Record<string, Array<boolean | undefined>>;

const defaultAxisGrids = (rendered: ReactNode): AxisGridSnapshot => {
  const result: AxisGridSnapshot = {};

  const visit = (node: ReactNode): void => {
    Children.forEach(node, child => {
      if (!isValidElement<{ children?: ReactNode; dimension?: string; grid?: boolean; id?: string }>(child)) return;

      if (child.type === PlotAxis && child.props.id === undefined && child.props.dimension !== undefined) {
        (result[child.props.dimension] ??= []).push(child.props.grid);
      }

      visit(child.props.children);
    });
  };

  visit(rendered);
  return result;
};

const renderWithGrids = (Component: FC, xGridVisible: boolean, yGridVisible: boolean): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: {},
        values: { xGridVisible, yGridVisible },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );

const pathData = (markup: string): Set<string> =>
  new Set((markup.match(/<path\b[^>]*>/g) ?? []).flatMap(tag => tag.match(/\bd="([^"]+)"/)?.[1] ?? []));

const addedPathData = (markup: string, baseline: string): Array<string> => {
  const baselinePaths = pathData(baseline);
  return [...pathData(markup)].filter(path => !baselinePaths.has(path));
};

const isVerticalGridPath = (path: string): boolean => {
  const segments = [
    ...path.matchAll(/M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+L\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g),
  ];
  return segments.length > 0 && segments.every(match => match[1] === match[3]);
};

const isHorizontalGridPath = (path: string): boolean => {
  const segments = [
    ...path.matchAll(/M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+L\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g),
  ];
  return segments.length > 0 && segments.every(match => match[2] === match[4]);
};

const controlLabel = (definition: PreviewPanelControlsDefinition, id: string): string | undefined =>
  getPreviewControlFields(definition).find(field => field.id === id)?.label;

const visibleControlIds = (
  definition: PreviewPanelControlsDefinition,
  values: Readonly<PreviewControlValues>,
): Array<string> =>
  resolveVisiblePreviewControlSections(definition.sections, values).flatMap(section =>
    section.controls.map(control => control.id),
  );

describe('coordinate composition grids', () => {
  it.each([
    [
      'dual y axes',
      coordinateCompositionScopesControls,
      englishCoordinateCompositionScopesControls,
      COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS,
    ],
    [
      'dual x axes',
      coordinateCompositionXAxisControls,
      englishCoordinateCompositionXAxisControls,
      COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS,
    ],
    [
      'facet playground',
      coordinateCompositionFacetControls,
      englishCoordinateCompositionFacetControls,
      COORDINATE_COMPOSITION_FACET_CONTROL_IDS,
    ],
    [
      'multi-level facet',
      coordinateCompositionFacetMultilevelControls,
      englishCoordinateCompositionFacetMultilevelControls,
      COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS,
    ],
    [
      'cartesian tracks',
      coordinateCompositionTracksControls,
      englishCoordinateCompositionTracksControls,
      COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS,
    ],
  ] as const)('%s names grid controls by the visible line direction', (_name, chinese, english, ids) => {
    expect(controlLabel(chinese, ids.xGridVisible)).toBe('纵向网格（x 轴）');
    expect(controlLabel(chinese, ids.yGridVisible)).toBe('横向网格（y 轴）');
    expect(controlLabel(english, ids.xGridVisible)).toBe('Vertical grid (x-axis)');
    expect(controlLabel(english, ids.yGridVisible)).toBe('Horizontal grid (y-axis)');
  });

  it('names polar grids by their radial and circular shapes', () => {
    expect(
      controlLabel(
        coordinateCompositionTracksPolarControls,
        COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible,
      ),
    ).toBe('放射网格（x / 角度）');
    expect(
      controlLabel(
        coordinateCompositionTracksPolarControls,
        COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible,
      ),
    ).toBe('环形网格（y / 半径）');
    expect(
      controlLabel(
        englishCoordinateCompositionTracksPolarControls,
        COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible,
      ),
    ).toBe('Radial grid (x / angle)');
    expect(
      controlLabel(
        englishCoordinateCompositionTracksPolarControls,
        COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible,
      ),
    ).toBe('Circular grid (y / radius)');
  });

  it.each([
    [
      'cartesian',
      coordinateCompositionTracksControls,
      englishCoordinateCompositionTracksControls,
      COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS,
    ],
    [
      'polar',
      coordinateCompositionTracksPolarControls,
      englishCoordinateCompositionTracksPolarControls,
      COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS,
    ],
  ] as const)('%s tracks hide the local y grid when local axes are disabled', (_name, chinese, english, ids) => {
    for (const definition of [chinese, english]) {
      expect(visibleControlIds(definition, { [ids.localAxes]: false })).not.toContain(ids.yGridVisible);
      expect(visibleControlIds(definition, { [ids.localAxes]: true })).toContain(ids.yGridVisible);
    }
  });

  it.each([
    ['dual y axes', scopesPreviewSource, { x: [false], y: [false] }],
    ['dual x axes', xAxisPreviewSource, { x: [false], y: [false] }],
    ['facet playground', facetPreviewSource, { x: [true], y: [true] }],
    ['multi-level facet', multilevelPreviewSource, { x: [true], y: [true] }],
    ['cartesian tracks', tracksPreviewSource, { x: [true], y: [true, true, true] }],
    ['polar tracks', polarTracksPreviewSource, { x: [true], y: [true, true] }],
  ] as const)(
    '%s drives every visible default axis from its canonical grid value',
    (_name, previewSource, expected) => {
      expect(defaultAxisGrids(previewSource.canonicalRender?.())).toEqual(expected);
    },
  );

  it.each([
    ['dual y axes', ScopesPreview, 'cartesian'],
    ['dual x axes', XAxisPreview, 'cartesian'],
    ['facet playground', FacetPreview, 'cartesian'],
    ['multi-level facet', MultilevelPreview, 'cartesian'],
    ['cartesian tracks', TracksPreview, 'cartesian'],
    ['polar tracks', PolarTracksPreview, 'polar'],
  ] as const)('%s exposes independent x and y grid controls', (_name, Component, coordinate) => {
    const baseline = renderWithGrids(Component, false, false);
    const xGridPaths = addedPathData(renderWithGrids(Component, true, false), baseline);
    const yGridPaths = addedPathData(renderWithGrids(Component, false, true), baseline);
    expect(xGridPaths.length).toBeGreaterThan(0);
    expect(yGridPaths.length).toBeGreaterThan(0);
    expect(xGridPaths.filter(path => yGridPaths.includes(path))).toEqual([]);

    if (coordinate === 'cartesian') {
      expect(xGridPaths.some(isVerticalGridPath)).toBe(true);
      expect(yGridPaths.some(isHorizontalGridPath)).toBe(true);
    } else {
      expect(xGridPaths.some(path => path.includes(' L '))).toBe(true);
      expect(yGridPaths.some(path => path.includes(' A '))).toBe(true);
    }
  });
});
