import type { PathCommand } from '../../contract';
import { guardProviderOutput, createCompositeContractError } from '../../resolve';
import type { IRTexContent } from '../../schemas';
import { assertProviderOutputNonNegative, snapshotProviderOutputJson } from '../shared';

/** TeX 字形路径的绘制通道 */
export type LoweredTexPaint =
  | {
      /** 区分无绘制、继承当前颜色与显式颜色 */
      kind: 'none';
    }
  | {
      /** 区分无绘制、继承当前颜色与显式颜色 */
      kind: 'currentColor';
    }
  | {
      /** 区分无绘制、继承当前颜色与显式颜色 */
      kind: 'color';
      /** 显式颜色分支使用的颜色字符串 */
      value: string;
    };

/** renderer-agnostic 的单条 TeX 绘制路径 */
export type LoweredTexPath = {
  /** 归一到 user units 的路径命令 */
  commands: Array<PathCommand>;
  /** 填充通道 */
  fill: LoweredTexPaint;
  /** 填充透明度 */
  fillOpacity?: number;
  /** 描边通道 */
  stroke: LoweredTexPaint;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边透明度 */
  strokeOpacity?: number;
  /** 路径整体透明度 */
  opacity?: number;
  /** 填充规则 */
  fillRule?: 'nonzero' | 'evenodd';
};

/** renderer-agnostic 的 TeX 字形降解结果 */
export type LoweredTex = {
  /** 按绘制顺序排列的字形与装饰路径 */
  paths: Array<LoweredTexPath>;
  /** 公式布局宽度 */
  width: number;
  /** 公式从顶部到底部的总高度 */
  height: number;
  /** 公式基线以下的深度 */
  depth: number;
};

/** 校验数值约束并脱离 lowerTex 返回的公式结果 */
export const snapshotLoweredTex = (value: LoweredTex): LoweredTex =>
  guardProviderOutput('lowerTex', () => {
    const snapshot = snapshotProviderOutputJson('lowerTex', value, 'result');
    assertProviderOutputNonNegative('lowerTex', snapshot.width, 'result.width');
    assertProviderOutputNonNegative('lowerTex', snapshot.height, 'result.height');
    assertProviderOutputNonNegative('lowerTex', snapshot.depth, 'result.depth');
    if (snapshot.depth > snapshot.height) {
      throw createCompositeContractError('lowerTex emit produced result.depth greater than result.height.');
    }
    snapshot.paths.forEach((path, index) => {
      const pathName = `paths[${index}]`;
      assertProviderOutputNonNegative('lowerTex', path.strokeWidth, `${pathName}.strokeWidth`);
    });
    return snapshot;
  });

/** 按字号降解公式；宿主颜色由绘制阶段解析，无法解析时返回 null */
export type TexLowerer = (content: IRTexContent, style: { fontSize: number }) => LoweredTex | null;
