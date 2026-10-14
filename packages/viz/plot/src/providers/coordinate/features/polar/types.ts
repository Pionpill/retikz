import type { IRNode } from '@retikz/core';
import type { BoundsInsets } from '@retikz/math';

import type { PlotLabelMeasure } from '../../../../shared';

/** 极坐标角向标签的布局输入 */
export type PolarAngularLabel = {
  /** 标签所在角度，单位为度 */
  angle: number;
  /** 标签文本 */
  text: string;
  /** 标签字体与换行配置 */
  node?: IRNode;
};

/** 极坐标角向标签的屏幕空间布局结果 */
export type PolarAngularLabelLayout = {
  /** 标签视觉盒中心 */
  position: [number, number];
  /** 随象限变化的默认文字对齐 */
  align: 'start' | 'middle' | 'end';
};

/** computePolarCoordinate 输入：角向刻度的实际角度与标签文本 */
export type PolarLayoutContext = {
  /** 本次分配的局部尺寸 */
  size: { width: number; height: number };
  /** 与实绘一致的文字测量环境 */
  text: {
    /** Core 提供的文字测量能力 */
    measure: PlotLabelMeasure;
    /** 标签缺省字号 */
    fontSize: number;
  };
  /** 布局与装饰的四边预留 */
  reserve?: Partial<BoundsInsets>;
  /** 用户逐边覆盖留白 */
  margin?: Partial<BoundsInsets>;
  /** 可见角向刻度标签 */
  angularLabels: ReadonlyArray<PolarAngularLabel>;
};

/** computePolarCoordinate 结果：圆心（屏幕坐标）+ 外半径（user units） */
export type PolarLayout = {
  /** 圆心（显式留白后的可用区域中心，屏幕坐标） */
  center: [number, number];
  /** 外半径（user units，满足圆与角向标签包围盒约束） */
  outerRadius: number;
};
