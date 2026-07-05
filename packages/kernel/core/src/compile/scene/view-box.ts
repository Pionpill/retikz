import { isPositiveBoundsRect } from '@retikz/math';

import type { Layout } from '../../contract';
import type { IRViewBox } from '../../schemas';

import { roundLayout } from './layout';

/** 校验显式 viewBox 的原始输入。 */
const assertViewBoxInput = (viewBox: IRViewBox): void => {
  if (!Number.isFinite(viewBox.x) || !Number.isFinite(viewBox.y)) {
    throw new Error(
      `viewBox has a non-finite origin (x=${String(viewBox.x)}, y=${String(viewBox.y)}); both must be finite.`,
    );
  }
  if (!Number.isFinite(viewBox.width) || viewBox.width <= 0) {
    throw new Error(
      `viewBox has an invalid width (${String(viewBox.width)}); it must be a finite number greater than 0.`,
    );
  }
  if (!Number.isFinite(viewBox.height) || viewBox.height <= 0) {
    throw new Error(
      `viewBox has an invalid height (${String(viewBox.height)}); it must be a finite number greater than 0.`,
    );
  }
};

/** 校验 round 后真正进入 Scene 的 viewBox layout。 */
const assertRoundedViewBoxLayout = (layout: Layout): Layout => {
  if (!isPositiveBoundsRect(layout)) {
    throw new Error(
      `viewBox rounds to an invalid layout (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check precision and coordinate magnitude.`,
    );
  }
  return layout;
};

/** 把显式 viewBox 转为 Scene.layout，并做输入和输出守卫。 */
export const viewBoxToLayout = (viewBox: IRViewBox, round: (n: number) => number): Layout => {
  assertViewBoxInput(viewBox);
  return assertRoundedViewBoxLayout(roundLayout(viewBox, round));
};
