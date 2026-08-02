import type { FC, ReactNode } from 'react';

/** Standard Legend 标题 marker 的属性 */
export type LegendTitleProps = Readonly<{
  /** 转换为唯一标题 IRChild 的 React element */
  children: ReactNode;
}>;

/** Standard Legend 离散条目 marker 的属性 */
export type LegendItemProps = Readonly<{
  /** Legend 内稳定且唯一的条目标识 */
  itemKey: string;
  /** 转换为唯一视觉样本 IRChild 的 React element */
  sample: ReactNode;
  /** 转换为可选标签 IRChild 的 React element */
  children?: ReactNode;
}>;

/** Standard Legend 连续样本 marker 的属性 */
export type LegendRampProps = Readonly<{
  /** 转换为唯一连续视觉样本 IRChild 的 React element */
  children: ReactNode;
}>;

/** Standard Legend 连续刻度 marker 的属性 */
export type LegendTickProps = Readonly<{
  /** Legend 内稳定且唯一的刻度标识 */
  tickKey: string;
  /** 沿连续样本主轴的归一化位置 */
  offset: number;
  /** 转换为可选刻度标签 IRChild 的 React element */
  children?: ReactNode;
}>;

/** 声明 Legend 标题，只能作为 Legend 的直接 child */
export const LegendTitle: FC<LegendTitleProps> = () => {
  throw new Error('LegendTitle must be used as a direct child of Legend.');
};

LegendTitle.displayName = 'LegendTitle';

/** 声明 Legend 离散条目，只能作为 items Legend 的直接 child */
export const LegendItem: FC<LegendItemProps> = () => {
  throw new Error('LegendItem must be used as a direct child of Legend.');
};

LegendItem.displayName = 'LegendItem';

/** 声明 Legend 连续样本，只能作为 ramp Legend 的直接 child */
export const LegendRamp: FC<LegendRampProps> = () => {
  throw new Error('LegendRamp must be used as a direct child of Legend.');
};

LegendRamp.displayName = 'LegendRamp';

/** 声明 Legend 连续刻度，只能作为 ramp Legend 的直接 child */
export const LegendTick: FC<LegendTickProps> = () => {
  throw new Error('LegendTick must be used as a direct child of Legend.');
};

LegendTick.displayName = 'LegendTick';
