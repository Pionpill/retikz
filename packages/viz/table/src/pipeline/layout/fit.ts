import type { BoundsRect } from '@retikz/math';

import type { TableCellTranslation } from './cell';

import { RetikzTableError } from '../../error';
import { deepFreeze } from '../../shared';

/** Cell 内容 fit 计算支持的策略 */
export type TableCellFit = 'none' | 'contain' | 'cover' | 'stretch';

/** replay root 局部坐标系使用的非负轴向缩放 */
export type TableCellFitScale = Readonly<{
  /** 横向缩放 */
  x: number;
  /** 纵向缩放 */
  y: number;
}>;

/** 验证 bounds 字段、尺寸和 max endpoint 均为可计算的有限值 */
const validateBoundsRect = (rect: BoundsRect, name: string): void => {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width < 0 ||
    rect.height < 0 ||
    !Number.isFinite(rect.x + rect.width) ||
    !Number.isFinite(rect.y + rect.height)
  ) {
    throw new RetikzTableError(`table: Cell ${name} must have finite coordinates and nonnegative dimensions`);
  }
};

/** 验证 fit scale 两轴均为有限非负数 */
const validateScale = (scale: TableCellFitScale): void => {
  if (!Number.isFinite(scale.x) || !Number.isFinite(scale.y) || scale.x < 0 || scale.y < 0) {
    throw new RetikzTableError('table: Cell fit scale must contain finite nonnegative x and y');
  }
};

/** 只为正 source 轴计算 ratio，让零 source 轴保持零面积 */
const ratioForPositiveSourceAxis = (targetSize: number, sourceSize: number): number | undefined =>
  sourceSize > 0 ? targetSize / sourceSize : undefined;

/** 根据 source allocation 与 content box 计算轴向 fit scale */
export const computeTableCellFitScale = (
  sourceAllocationBounds: BoundsRect,
  contentBox: BoundsRect,
  fit: TableCellFit,
): TableCellFitScale => {
  validateBoundsRect(sourceAllocationBounds, 'sourceAllocationBounds');
  validateBoundsRect(contentBox, 'contentBox');

  let scale: TableCellFitScale;
  switch (fit) {
    case 'none':
      scale = { x: 1, y: 1 };
      break;
    case 'stretch':
      scale = {
        x: sourceAllocationBounds.width > 0 ? contentBox.width / sourceAllocationBounds.width : 1,
        y: sourceAllocationBounds.height > 0 ? contentBox.height / sourceAllocationBounds.height : 1,
      };
      break;
    case 'contain':
    case 'cover': {
      const ratios = [
        ratioForPositiveSourceAxis(contentBox.width, sourceAllocationBounds.width),
        ratioForPositiveSourceAxis(contentBox.height, sourceAllocationBounds.height),
      ].filter((ratio): ratio is number => ratio !== undefined);
      const value = ratios.length === 0 ? 1 : fit === 'contain' ? Math.min(...ratios) : Math.max(...ratios);
      scale = { x: value, y: value };
      break;
    }
    default:
      throw new RetikzTableError('table: Cell fit must be none, contain, cover, or stretch');
  }

  validateScale(scale);
  return deepFreeze(scale);
};

/** 按 replay-root local scale 与 Table-local translation 投影 bounds */
export const projectTableCellBounds = (
  bounds: BoundsRect,
  scale: TableCellFitScale,
  translation: TableCellTranslation,
): BoundsRect => {
  validateBoundsRect(bounds, 'bounds');
  validateScale(scale);
  if (!Number.isFinite(translation.x) || !Number.isFinite(translation.y)) {
    throw new RetikzTableError('table: Cell bounds translation must contain finite x and y');
  }
  const projected = {
    x: bounds.x * scale.x + translation.x,
    y: bounds.y * scale.y + translation.y,
    width: bounds.width * scale.x,
    height: bounds.height * scale.y,
  };
  validateBoundsRect(projected, 'projected bounds');
  return deepFreeze(projected);
};
