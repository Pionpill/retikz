import type { IRJsonObject } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type {
  CollectionContext,
  PlotAuthoringDeclarations,
  PlotAuthoringRuntimeSource,
  PlotDeclarationCollection,
  PlotDeclarationKind,
  PlotDeclarationPath,
  ScaffoldTrack,
} from '@retikz/plot-vanilla';
import type { ReactElement, ReactNode } from 'react';

import { JsonObjectSchema } from '@retikz/core';
import { Fragment, isValidElement } from 'react';

import {
  Axis,
  Facet,
  IntervalMark,
  Legend,
  PathMark,
  PointMark,
  ReferenceMark,
  RelationMark,
  Scaffold,
  Scale,
  Track,
  Transform as TransformComponent,
} from '../components';

const declarationKindOf = (element: ReactElement): PlotDeclarationKind | undefined => {
  if (element.type === Facet) return 'facet';
  if (element.type === Scaffold) return 'scaffold';
  if (element.type === Track) return 'track';
  if (element.type === PathMark) return 'path-mark';
  if (element.type === PointMark) return 'point-mark';
  if (element.type === IntervalMark) return 'interval-mark';
  if (element.type === ReferenceMark) return 'reference-mark';
  if (element.type === RelationMark) return 'relation-mark';
  if (element.type === Axis) return 'axis';
  if (element.type === Legend) return 'legend';
  if (element.type === Scale) return 'scale';
  if (element.type === TransformComponent) return 'transform';
  return undefined;
};

const plainPropsOf = (props: Record<string, unknown>, overrides: Record<string, unknown> = {}): IRJsonObject => {
  const plain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries({ ...props, ...overrides })) {
    if (key === 'resolveLabel' || (key === 'children' && !Object.hasOwn(overrides, 'children')) || value === undefined)
      continue;
    plain[key] = value;
  }
  return JsonObjectSchema.parse(plain);
};

const isRawIterable = (value: unknown): value is Iterable<unknown> =>
  value !== null &&
  typeof value !== 'string' &&
  typeof value === 'object' &&
  !isValidElement(value) &&
  Symbol.iterator in value &&
  typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function';

/** 以原始 ReactNode slot 路径收集 JSON-safe Plot declarations 与 runtime sidecar */
export const collectPlotDeclarations = (children: ReactNode): PlotDeclarationCollection => {
  const declarations: PlotAuthoringDeclarations = [];
  const runtimeSources: Array<PlotAuthoringRuntimeSource> = [];

  const appendDeclaration = (
    kind: PlotDeclarationKind,
    props: IRJsonObject,
    path: PlotDeclarationPath,
    context: CollectionContext,
  ): void => {
    declarations.push({
      kind,
      props,
      path,
      ...(Object.keys(context).length === 0 ? {} : { context: { ...context } }),
    });
  };

  const visitContainer = (
    value: unknown,
    path: PlotDeclarationPath,
    context: CollectionContext,
    visit: (slot: unknown, slotPath: PlotDeclarationPath, slotContext: CollectionContext) => void,
  ): void => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) visit(value[index], [...path, index], context);
      return;
    }
    if (isRawIterable(value)) {
      let index = 0;
      for (const slot of value) {
        visit(slot, [...path, index], context);
        index += 1;
      }
      return;
    }
    visit(value, [...path, 0], context);
  };

  const childTrackSpecsOf = (value: unknown): Array<ScaffoldTrack> => {
    const tracks: Array<ScaffoldTrack> = [];
    const visitTrack = (slot: unknown): void => {
      if (Array.isArray(slot) || isRawIterable(slot)) {
        visitContainer(slot, [], {}, candidate => visitTrack(candidate));
        return;
      }
      if (!isValidElement(slot)) return;
      if (slot.type === Fragment) {
        visitContainer((slot.props as { children?: ReactNode }).children, [], {}, candidate => visitTrack(candidate));
        return;
      }
      if (slot.type !== Track) return;
      const props = slot.props as ScaffoldTrack & { children?: ReactNode };
      tracks.push({
        id: props.id,
        band: props.band,
        ...(props.view !== undefined ? { view: props.view } : {}),
        ...(props.coordinate !== undefined ? { coordinate: props.coordinate } : {}),
        ...(props.order !== undefined ? { order: props.order } : {}),
      });
    };
    visitContainer(value, [], {}, candidate => visitTrack(candidate));
    return tracks;
  };

  const visitSlot = (slot: unknown, path: PlotDeclarationPath, context: CollectionContext): void => {
    if (Array.isArray(slot) || isRawIterable(slot)) {
      visitContainer(slot, path, context, visitSlot);
      return;
    }
    if (slot === null || slot === undefined || typeof slot === 'boolean') return;
    if (!isValidElement(slot)) {
      appendDeclaration('unsupported', { valueKind: typeof slot }, path, context);
      return;
    }
    if (slot.type === Fragment) {
      visitContainer((slot.props as { children?: ReactNode }).children, [...path, 'children'], context, visitSlot);
      return;
    }

    const kind = declarationKindOf(slot);
    if (kind === undefined) {
      appendDeclaration('unsupported', { valueKind: 'element' }, path, context);
      return;
    }
    const rawProps = slot.props as Record<string, unknown>;
    const resolveLabel = rawProps.resolveLabel;
    if (typeof resolveLabel === 'function') {
      runtimeSources.push({
        kind: 'resolve-label',
        path: [...path, 'props', 'resolveLabel'],
        ...(typeof rawProps.id === 'string' ? { markId: rawProps.id } : {}),
        resolveLabel: resolveLabel as (row: ExternalRow) => string,
      });
    }

    if (kind === 'facet') {
      appendDeclaration(kind, plainPropsOf(rawProps), path, context);
      const facetId = rawProps.id;
      if (typeof facetId === 'string') {
        visitContainer(rawProps.children, [...path, 'props', 'children'], { facetId }, visitSlot);
      }
      return;
    }
    if (kind === 'scaffold') {
      const scaffoldId = rawProps.id;
      const propTracks = Array.isArray(rawProps.tracks) ? rawProps.tracks : [];
      const tracks = [...propTracks, ...childTrackSpecsOf(rawProps.children)];
      appendDeclaration(kind, plainPropsOf(rawProps, { tracks }), path, context);
      if (typeof scaffoldId !== 'string') return;
      const visitScaffoldSlot = (
        child: unknown,
        childPath: PlotDeclarationPath,
        childContext: CollectionContext,
      ): void => {
        if (Array.isArray(child) || isRawIterable(child)) {
          visitContainer(child, childPath, childContext, visitScaffoldSlot);
          return;
        }
        if (!isValidElement(child)) {
          visitSlot(child, childPath, { scaffoldId });
          return;
        }
        if (child.type === Fragment) {
          visitContainer(
            (child.props as { children?: ReactNode }).children,
            [...childPath, 'children'],
            childContext,
            visitScaffoldSlot,
          );
          return;
        }
        if (child.type === Track) {
          const trackProps = child.props as ScaffoldTrack & { children?: ReactNode };
          visitContainer(
            trackProps.children,
            [...childPath, 'props', 'children'],
            { trackId: trackProps.id },
            visitSlot,
          );
          return;
        }
        visitSlot(child, childPath, { scaffoldId });
      };
      visitContainer(rawProps.children, [...path, 'props', 'children'], { scaffoldId }, visitScaffoldSlot);
      return;
    }

    appendDeclaration(kind, plainPropsOf(rawProps), path, context);
  };

  visitContainer(children, ['children'], {}, visitSlot);
  return { declarations, runtimeSources };
};
