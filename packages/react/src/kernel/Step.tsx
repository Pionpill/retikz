import type { FC } from 'react';
import type { IRTarget } from '@retikz/core';
import { TIKZ_STEP } from './_displayNames';

/**
 * <Step> 组件的 props。
 * v0.1.0-alpha 仅支持 'move' 与 'line'，kind 默认 'line'。
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
    };

/**
 * Step 是 DSL 标记组件——本身不渲染。
 * 必须作为 <Path> 的直接子节点出现，由 <Path> 的 children 扫描读出。
 */
export const Step: FC<StepProps> = () => null;
Step.displayName = TIKZ_STEP;
