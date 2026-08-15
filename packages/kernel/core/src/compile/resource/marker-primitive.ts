import type { MarkerPrimitive } from '../../contract';

import { CompositeContractError } from '../../resolve/diagnostics';
import {
  assertProviderOutputDashPattern,
  assertProviderOutputFinite,
  assertProviderOutputKeys,
  assertProviderOutputOptionalFinite,
  assertProviderOutputPaint,
  assertProviderOutputPathCommands,
  assertProviderOutputPathEnums,
  assertProviderOutputTransforms,
  assertProviderOutputUnitInterval,
  failProviderOutput,
  omitProviderOutputUndefined,
  providerOutputArray,
  providerOutputRecord,
  snapshotProviderOutputJson,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';

const ownDataValues = (value: object): Array<unknown> =>
  Reflect.ownKeys(value).flatMap(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && 'value' in descriptor ? [descriptor.value] : [];
  });

const visitNoFunction = (owner: string, value: unknown, seen: WeakSet<object>): void => {
  if (typeof value === 'function') {
    throw new CompositeContractError(
      `${owner} emit produced a marker containing a function; markers must be plain JSON data.`,
    );
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) visitNoFunction(owner, entry, seen);
  } else {
    for (const entry of ownDataValues(value)) visitNoFunction(owner, entry, seen);
  }
};

/** 深度查 emit 产物里有没有函数（守 Scene 100% JSON 可序列化） */
export const assertNoFunction = (owner: string, value: unknown): void => {
  visitNoFunction(owner, value, new WeakSet());
};

const visitFiniteNumbers = (owner: string, value: unknown, seen: WeakSet<object>): void => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CompositeContractError(
        `${owner} emit produced a marker with a non-finite number (${String(value)}); marker coordinates must be finite.`,
      );
    }
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) visitFiniteNumbers(owner, entry, seen);
  } else {
    for (const entry of ownDataValues(value)) visitFiniteNumbers(owner, entry, seen);
  }
};

/** 深度校验 marker 产物中的数值都为 finite */
export const assertFiniteNumbers = (owner: string, value: unknown): void => {
  visitFiniteNumbers(owner, value, new WeakSet());
};

const assertMarkerStrokeStyle = (owner: string, candidate: Record<string, unknown>, path: string): void => {
  assertProviderOutputPaint(owner, candidate.fill, 'fill', true);
  assertProviderOutputPaint(owner, candidate.stroke, 'stroke', true);
  assertProviderOutputUnitInterval(owner, candidate, 'fillOpacity', path);
  assertProviderOutputUnitInterval(owner, candidate, 'strokeOpacity', path);
  assertProviderOutputOptionalFinite(owner, candidate, 'strokeWidth', path, true);
  assertProviderOutputOptionalFinite(owner, candidate, 'dashOffset', path);
  assertProviderOutputDashPattern(owner, candidate, path);
};

const visitMarkerPrimitive = (owner: string, prim: unknown, active: WeakSet<object>): void => {
  const candidate = providerOutputRecord(owner, prim, 'marker primitive');
  const path = 'marker';
  switch (candidate.type) {
    case 'path':
      assertProviderOutputKeys(
        owner,
        candidate,
        [
          'type',
          'commands',
          'fill',
          'fillOpacity',
          'fillRule',
          'stroke',
          'strokeOpacity',
          'strokeWidth',
          'dashPattern',
          'dashOffset',
          'strokeLinecap',
          'strokeLinejoin',
        ],
        'marker primitive',
      );
      assertProviderOutputPathCommands(owner, candidate.commands, 'marker path');
      assertProviderOutputPathEnums(owner, candidate, path);
      assertMarkerStrokeStyle(owner, candidate, path);
      return;
    case 'ellipse':
      assertProviderOutputKeys(
        owner,
        candidate,
        [
          'type',
          'cx',
          'cy',
          'rx',
          'ry',
          'rotate',
          'fill',
          'fillOpacity',
          'stroke',
          'strokeOpacity',
          'strokeWidth',
          'dashPattern',
          'dashOffset',
        ],
        'marker primitive',
      );
      assertProviderOutputFinite(owner, candidate.cx, 'marker cx');
      assertProviderOutputFinite(owner, candidate.cy, 'marker cy');
      assertProviderOutputFinite(owner, candidate.rx, 'marker rx', true);
      assertProviderOutputFinite(owner, candidate.ry, 'marker ry', true);
      assertProviderOutputOptionalFinite(owner, candidate, 'rotate', path);
      assertMarkerStrokeStyle(owner, candidate, path);
      return;
    case 'rect':
      assertProviderOutputKeys(
        owner,
        candidate,
        [
          'type',
          'x',
          'y',
          'width',
          'height',
          'fill',
          'fillOpacity',
          'stroke',
          'strokeOpacity',
          'strokeWidth',
          'dashPattern',
          'dashOffset',
          'cornerRadius',
        ],
        'marker primitive',
      );
      assertProviderOutputFinite(owner, candidate.x, 'marker x');
      assertProviderOutputFinite(owner, candidate.y, 'marker y');
      assertProviderOutputFinite(owner, candidate.width, 'marker width', true);
      assertProviderOutputFinite(owner, candidate.height, 'marker height', true);
      assertProviderOutputOptionalFinite(owner, candidate, 'cornerRadius', path, true);
      assertMarkerStrokeStyle(owner, candidate, path);
      return;
    case 'group': {
      assertProviderOutputKeys(owner, candidate, ['type', 'transforms', 'children'], 'marker primitive');
      assertProviderOutputTransforms(owner, candidate.transforms, 'marker transforms');
      const children = providerOutputArray(owner, candidate.children, 'marker group.children');
      if (active.has(candidate)) failProviderOutput(owner, 'a cyclic marker group');
      active.add(candidate);
      try {
        for (const child of children) {
          visitMarkerPrimitive(owner, child, active);
        }
      } finally {
        active.delete(candidate);
      }
      return;
    }
    default:
      failProviderOutput(
        owner,
        `an invalid marker primitive type '${String(candidate.type)}'; allowed: group, path, ellipse, rect`,
      );
  }
};

/** 校验单个 marker primitive 符合 marker 允许的窄子集 */
export const assertValidMarkerPrim = (owner: string, prim: unknown): void => {
  visitMarkerPrimitive(owner, prim, new WeakSet());
};

/** 在统一 fatal boundary 内物化并校验 Marker provider output */
export const validateMarkerPrimitives = (owner: string, emitted: unknown): Array<MarkerPrimitive> =>
  withProviderOutputValidationBoundary(owner, () => {
    if (
      emitted === null ||
      (typeof emitted !== 'object' && typeof emitted !== 'function') ||
      typeof (emitted as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== 'function'
    ) {
      throw new CompositeContractError(
        `${owner} emit failed output validation: expected an iterable of marker primitives.`,
      );
    }
    const marker = [...(emitted as Iterable<unknown>)].map((primitive, index) =>
      snapshotProviderOutputJson(owner, primitive, `marker primitive[${index}]`),
    );
    assertNoFunction(owner, marker);
    assertFiniteNumbers(owner, marker);
    const active = new WeakSet<object>();
    for (const prim of providerOutputArray(owner, marker, 'marker primitive list')) {
      visitMarkerPrimitive(owner, prim, active);
    }
    return marker.map(primitive => omitProviderOutputUndefined(primitive)) as Array<MarkerPrimitive>;
  });
