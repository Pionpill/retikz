/**
 * 显式 viewBox → Scene.layout（finite 守卫 + round）
 * @description schema 的 `.positive()` 只在 IR parse 守门；compileToScene 直接收手搓 / LLM IR 会绕过，
 *   故此处是唯一真实关口——非 finite / 非正尺寸会污染 Scene round-trip。非法即抛清晰错（不泄漏进 Scene）；
 *   四字段按 Scene precision round（与自动算 layout 同口径）。
 */
export const viewBoxToLayout = (
  vb: { x: number; y: number; width: number; height: number },
  round: (n: number) => number,
): { x: number; y: number; width: number; height: number } => {
  // 先守 raw（直接 NaN/Infinity/退化的清晰错），再 round，再复检 round 后值——
  // 极端 precision（10**p 溢出 Infinity）/ 极值坐标（×10**p 溢出）/ 负 precision（round 成 0 宽）
  // 都可能让"合法 raw" round 后变脏；round 产物才是真正进 Scene 的值，故 round 后是最终关口。
  if (!Number.isFinite(vb.x) || !Number.isFinite(vb.y)) {
    throw new Error(`viewBox has a non-finite origin (x=${String(vb.x)}, y=${String(vb.y)}); both must be finite.`);
  }
  if (!Number.isFinite(vb.width) || vb.width <= 0) {
    throw new Error(`viewBox has an invalid width (${String(vb.width)}); it must be a finite number greater than 0.`);
  }
  if (!Number.isFinite(vb.height) || vb.height <= 0) {
    throw new Error(
      `viewBox has an invalid height (${String(vb.height)}); it must be a finite number greater than 0.`,
    );
  }
  const x = round(vb.x);
  const y = round(vb.y);
  const width = round(vb.width);
  const height = round(vb.height);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error(
      `viewBox rounds to an invalid layout (x=${String(x)}, y=${String(y)}, width=${String(width)}, height=${String(height)}); check precision and coordinate magnitude.`,
    );
  }
  return { x, y, width, height };
};

/**
 * 自动算 layout 的 finite 守卫：四值非全 finite 即抛清晰错（LLM 可读），不泄漏进 Scene
 * @description computeLayout 由 `center ± halfWidth` 等运算聚合——极端 shape 几何（如 outerRadius:1e308
 *   半轴 finite 但 center+halfWidth 溢出 Infinity）会让运算结果脏。schema 的 `` 只守单字段输入，
 *   守不住聚合后的溢出；此处复用 viewBoxToLayout 同款 finite 关口，是自动 layout 进 Scene 前的唯一兜底。
 */
export const assertFiniteLayout = (layout: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } => {
  if (
    !Number.isFinite(layout.x) ||
    !Number.isFinite(layout.y) ||
    !Number.isFinite(layout.width) ||
    !Number.isFinite(layout.height)
  ) {
    throw new Error(
      `Node layout produced non-finite bounds (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check shape geometry (e.g. extreme radius).`,
    );
  }
  return layout;
};
