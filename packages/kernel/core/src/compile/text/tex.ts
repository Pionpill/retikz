import type { PathCommand } from '../../contract';
import type { IRTexContent } from '../../schemas';

import { PathCommandSchema } from '../../schemas';
import { cloneAndFreezeJson } from '../../shared/json';
import {
  assertProviderOutputFinite,
  assertProviderOutputKeys,
  assertProviderOutputOptionalFinite,
  assertProviderOutputPathCommands,
  assertProviderOutputUnitInterval,
  failProviderOutput,
  providerOutputArray,
  providerOutputRecord,
  snapshotProviderOutputJson,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';

/** TeX 字形路径的绘制通道 */
export type LoweredTexPaint = { kind: 'none' } | { kind: 'currentColor' } | { kind: 'color'; value: string };

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

/** 校验并复制 TeX paint 通道 */
const snapshotLoweredTexPaint = (owner: string, value: unknown, path: string): LoweredTexPaint => {
  const paint = providerOutputRecord(owner, value, path);
  if (paint.kind === 'none' || paint.kind === 'currentColor') {
    assertProviderOutputKeys(owner, paint, ['kind'], path);
    return { kind: paint.kind };
  }
  if (paint.kind === 'color') {
    assertProviderOutputKeys(owner, paint, ['kind', 'value'], path);
    const color = paint.value;
    if (typeof color === 'string') return { kind: 'color', value: color };
    return failProviderOutput(owner, `an invalid ${path}.value`);
  }
  return failProviderOutput(owner, `an invalid ${path}.kind`);
};

/** 校验并复制一条 TeX path */
const snapshotLoweredTexPath = (owner: string, value: unknown, index: number): LoweredTexPath => {
  const pathName = `paths[${index}]`;
  const path = providerOutputRecord(owner, value, pathName);
  assertProviderOutputKeys(
    owner,
    path,
    ['commands', 'fill', 'fillOpacity', 'stroke', 'strokeWidth', 'strokeOpacity', 'opacity', 'fillRule'],
    pathName,
  );
  assertProviderOutputPathCommands(owner, path.commands, pathName);
  assertProviderOutputUnitInterval(owner, path, 'fillOpacity', pathName);
  assertProviderOutputOptionalFinite(owner, path, 'strokeWidth', pathName, true);
  assertProviderOutputUnitInterval(owner, path, 'strokeOpacity', pathName);
  assertProviderOutputUnitInterval(owner, path, 'opacity', pathName);
  if (path.fillRule !== undefined && path.fillRule !== 'nonzero' && path.fillRule !== 'evenodd') {
    failProviderOutput(owner, `an invalid ${pathName}.fillRule`);
  }
  const commands = providerOutputArray(owner, path.commands, `${pathName}.commands`).map(command =>
    PathCommandSchema.parse(command),
  );
  return {
    commands,
    fill: snapshotLoweredTexPaint(owner, path.fill, `${pathName}.fill`),
    ...(path.fillOpacity === undefined ? {} : { fillOpacity: path.fillOpacity as number }),
    stroke: snapshotLoweredTexPaint(owner, path.stroke, `${pathName}.stroke`),
    ...(path.strokeWidth === undefined ? {} : { strokeWidth: path.strokeWidth as number }),
    ...(path.strokeOpacity === undefined ? {} : { strokeOpacity: path.strokeOpacity as number }),
    ...(path.opacity === undefined ? {} : { opacity: path.opacity as number }),
    ...(path.fillRule === undefined ? {} : { fillRule: path.fillRule as 'nonzero' | 'evenodd' }),
  };
};

/** 校验、脱离并冻结 lowerTex 返回的 renderer-neutral 公式结果 */
export const snapshotLoweredTex = (value: unknown): LoweredTex =>
  withProviderOutputValidationBoundary('lowerTex', () => {
    const snapshot = snapshotProviderOutputJson('lowerTex', value, 'result');
    const lowered = providerOutputRecord('lowerTex', snapshot, 'result');
    assertProviderOutputKeys('lowerTex', lowered, ['paths', 'width', 'height', 'depth'], 'result');
    assertProviderOutputFinite('lowerTex', lowered.width, 'result.width', true);
    assertProviderOutputFinite('lowerTex', lowered.height, 'result.height', true);
    assertProviderOutputFinite('lowerTex', lowered.depth, 'result.depth', true);
    if ((lowered.depth as number) > (lowered.height as number)) {
      failProviderOutput('lowerTex', 'result.depth greater than result.height');
    }
    const paths = providerOutputArray('lowerTex', lowered.paths, 'result.paths').map((path, index) =>
      snapshotLoweredTexPath('lowerTex', path, index),
    );
    return cloneAndFreezeJson(
      {
        paths,
        width: lowered.width as number,
        height: lowered.height as number,
        depth: lowered.depth as number,
      },
      'lowerTex result',
    );
  });

/** 把 TeX 内容按文字样式降解为字形轮廓；无法解析时返回 null */
export type LowerTex = (content: IRTexContent, style: { fontSize: number; color?: string }) => LoweredTex | null;
