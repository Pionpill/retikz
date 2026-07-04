/** 把显式 viewBox 转为 Scene.layout，并做 finite 守卫。 */
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

/** 校验自动 layout 不含非 finite 值。 */
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
