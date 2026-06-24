import type { MarkerPrimitive } from '../primitive/marker';

/**
 * marker 窄子集运行时栅栏（arrow + pattern 共用）
 * @description `MarkerPrimitive` 的窄子集（type 限 path/ellipse/rect/group、fill 限 string | contextStroke、
 *   无外部 resourceRef / text / 函数）TS 只能编译期守门；第三方 / LLM 写出的 emit 会在运行时绕过类型，
 *   故这里做运行时校验。arrow（marker 几何）与 pattern（motif 几何）emit 产物同契约，复用本组校验。
 *   `owner` 是错误消息里的归属串（如 `Arrow 'normal'` / `Pattern 'lines'`），便于第三方 / LLM 自修。
 */

/** marker 子集允许的 primitive type（窄子集运行时栅栏） */
const MARKER_PRIM_TYPES = new Set(['path', 'ellipse', 'rect', 'group']);

/** 深度查 emit 产物里有没有函数（守 Scene 100% JSON 可序列化） */
export const assertNoFunction = (owner: string, value: unknown): void => {
  if (typeof value === 'function') {
    throw new Error(
      `${owner} emit produced a marker containing a function; markers must be plain JSON data.`,
    );
  }
  if (Array.isArray(value)) {
    for (const v of value) assertNoFunction(owner, v);
  } else if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) assertNoFunction(owner, v);
  }
};

/**
 * 深度查 emit 产物里有没有非 finite 数（NaN / Infinity）
 * @description 第三方 / LLM 的 emit 算错坐标（除零 / 溢出）会产 NaN / Infinity；`JSON.stringify` 把它们变成
 *   `null`，破坏 Scene round-trip 等价。故在此抛含 owner 的清晰错，不放任非 finite 流入 Scene（与 arrow
 *   geometry / path generator 的 finite 守卫同源）。
 */
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

/**
 * 递归校验单个 emit 产物符合 `MarkerPrimitive` 窄子集（运行时栅栏，TS 只能编译期守门）
 * @description type 限 path/ellipse/rect/group（拒 text 等）；fill 限 string | contextStroke（拒 resourceRef
 *   等外部资源引用）；group 递归 children。守"marker 内无文本布局 / 无外部资源 / 无递归 marker"契约。
 */
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

/**
 * 跑完整窄子集 + JSON-safe 校验（产物逐个过 `assertValidMarkerPrim` + 深度无函数检查）
 * @description arrow / pattern 调 emit 收齐 `MarkerPrimitive[]` 后调用；任一原语违窄子集即抛含 owner 的清晰错。
 */
export const validateMarkerPrimitives = (
  owner: string,
  marker: ReadonlyArray<MarkerPrimitive>,
): void => {
  for (const prim of marker) assertValidMarkerPrim(owner, prim);
  assertNoFunction(owner, marker);
  assertFiniteNumbers(owner, marker);
};
