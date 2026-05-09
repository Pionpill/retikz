import type { FC } from 'react';
import type { IRControlPoint, IRTarget } from '@retikz/core';
import { TIKZ_STEP } from './_displayNames';

/**
 * <Step> 组件的 props。
 * alpha.3 起支持十种 kind：'move' / 'line' / 'step'（折角）/ 'cycle'（闭合）/
 * 'curve'（二次贝塞尔）/ 'cubic'（三次贝塞尔）/ 'bend'（弧形简记）/
 * 'arc'（圆弧段）/ 'circlePath'（整圆）/ 'ellipsePath'（整椭圆）。
 * kind 默认 'line'。
 */
export type StepProps =
  | {
      /** 移动游标但不绘制（类似 SVG path "M"） */
      kind: 'move';
      /** 移动目标点 */
      to: IRTarget;
    }
  | {
      /** 直线动作；省略时默认 'line' */
      kind?: 'line';
      /** 直线终点 */
      to: IRTarget;
    }
  | {
      /** 折角段：从游标经一个直角拐点到目标点（TikZ `-|` / `|-`） */
      kind: 'step';
      /** 折角走向：`-|` 先水平后垂直；`|-` 先垂直后水平 */
      via: '-|' | '|-';
      /** 折角终点 */
      to: IRTarget;
    }
  | {
      /** 闭合：把当前子路径回到最近一个 move 起点（TikZ `cycle` / SVG `Z`） */
      kind: 'cycle';
    }
  | {
      /** 二次贝塞尔：一个控制点（TikZ `.. controls (B) ..`） */
      kind: 'curve';
      /** 控制点（alpha.3 仅支持 [x, y]，未来可能扩展） */
      control: IRControlPoint;
      /** 曲线终点 */
      to: IRTarget;
    }
  | {
      /** 三次贝塞尔：两个控制点（TikZ `.. controls (B) and (C) ..`） */
      kind: 'cubic';
      /** 第一控制点（影响起点切线） */
      control1: IRControlPoint;
      /** 第二控制点（影响终点切线） */
      control2: IRControlPoint;
      /** 曲线终点 */
      to: IRTarget;
    }
  | {
      /** 弧形简记：按方向 + 角度生成 cubic（TikZ `to[bend left=N]` / `to[bend right=N]`） */
      kind: 'bend';
      /** 弯向：'left' / 'right'（视觉左右，相对 from→to） */
      bendDirection: 'left' | 'right';
      /** 弯角度（度），缺省 30 */
      bendAngle?: number;
      /** 终点 */
      to: IRTarget;
    }
  | {
      /** 弧段：以游标为圆心，按起末角度 + 半径绘制（TikZ `arc[start angle=…, end angle=…, radius=…]`） */
      kind: 'arc';
      /** 弧的起始角度（度），CCW from +x（注意 retikz polar y 轴向下，角度 90 视觉朝下） */
      startAngle: number;
      /** 弧的终止角度（度） */
      endAngle: number;
      /** 弧的半径 */
      radius: number;
    }
  | {
      /** 整圆：以游标为圆心，按半径绘制；画完画笔留在圆心 */
      kind: 'circlePath';
      /** 圆的半径 */
      radius: number;
    }
  | {
      /** 整椭圆：以游标为圆心，按 x/y 轴半径绘制；画完画笔留在圆心 */
      kind: 'ellipsePath';
      /** 椭圆 x 轴半径 */
      radiusX: number;
      /** 椭圆 y 轴半径 */
      radiusY: number;
    };

/**
 * Step 是 DSL 标记组件——本身不渲染。
 * 必须作为 <Path> 的直接子节点出现，由 <Path> 的 children 扫描读出。
 */
export const Step: FC<StepProps> = () => null;
Step.displayName = TIKZ_STEP;
