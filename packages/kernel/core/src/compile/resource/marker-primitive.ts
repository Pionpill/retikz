import type { MarkerPrimitive } from '../../contract';

/** marker 子集允许的 primitive type（窄子集运行时栅栏） */
const MARKER_PRIM_TYPES = new Set(['path', 'ellipse', 'rect', 'group']);

/** 深度查 emit 产物里有没有函数（守 Scene 100% JSON 可序列化） */
export const assertNoFunction = (owner: string, value: unknown): void => {
  if (typeof value === 'function') {
    throw new Error(`${owner} emit produced a marker containing a function; markers must be plain JSON data.`);
  }
  if (Array.isArray(value)) {
    for (const v of value) assertNoFunction(owner, v);
  } else if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) assertNoFunction(owner, v);
  }
};

/** 深度校验 marker 产物中的数值都为 finite */
export const assertFiniteNumbers = (owner: string, value: unknown): void => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${owner} emit produced a marker with a non-finite number (${String(value)}); marker coordinates must be finite.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) assertFiniteNumbers(owner, v);
  } else if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) assertFiniteNumbers(owner, v);
  }
};

/** 校验单个 marker primitive 符合 marker 允许的窄子集 */
export const assertValidMarkerPrim = (owner: string, prim: unknown): void => {
  if (prim === null || typeof prim !== 'object') {
    throw new Error(`${owner} emit produced a non-object marker primitive.`);
  }
  const type = (prim as { type?: unknown }).type;
  if (typeof type !== 'string' || !MARKER_PRIM_TYPES.has(type)) {
    throw new Error(
      `${owner} emit produced an invalid marker primitive type '${String(type)}'; allowed: group, path, ellipse, rect.`,
    );
  }
  const fill = (prim as { fill?: unknown }).fill;
  if (
    fill !== undefined &&
    typeof fill !== 'string' &&
    !(typeof fill === 'object' && fill !== null && (fill as { kind?: unknown }).kind === 'contextStroke')
  ) {
    throw new Error(
      `${owner} marker fill must be a color string or { kind: 'contextStroke' }; external paint references are not allowed inside markers.`,
    );
  }
  if (type === 'group') {
    const children = (prim as { children?: unknown }).children;
    if (!Array.isArray(children)) {
      throw new Error(`${owner} marker group must have a children array.`);
    }
    for (const child of children) assertValidMarkerPrim(owner, child);
  }
};

/** 校验 marker primitive 列表可安全写入 Scene */
export const validateMarkerPrimitives = (owner: string, marker: ReadonlyArray<MarkerPrimitive>): void => {
  for (const prim of marker) assertValidMarkerPrim(owner, prim);
  assertNoFunction(owner, marker);
  assertFiniteNumbers(owner, marker);
};
