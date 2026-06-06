/* eslint-disable react-refresh/only-export-components -- 形状定义、注册表与元件组件成组放在一处便于各 step 复用；本文件不是 HMR 热点 */
import {
  type IRAnchorRef,
  type IRNodeLabel,
  type IRNodeTarget,
  type Position,
  type Rect,
  type ScenePrimitive,
  type ShapeDefinition,
  defineShape,
  localToWorld,
  worldToLocal,
} from '@retikz/core';
import { Node } from '@retikz/react';
import { z } from 'zod';
import type { FC } from 'react';

/** 元件可选标签（透传给内部 Node 的 label，TikZ `[label=above:foo]` 同义） */
type CircuitLabel = IRNodeLabel | Array<IRNodeLabel>;

const INK = 'currentColor';
/** 线条 / 引线统一描边宽度，和 Step 1 电表保持一致 */
const STROKE_WIDTH = 3;
/** 各元件每侧引线长度（viewBox 单位） */
const BATTERY_LEAD = 51;
const SWITCH_LEAD = 56;
/** 电阻 / 滑动变阻器共用（滑动变阻器整体与电阻一致，仅多一条斜箭头） */
const RESISTOR_LEAD = 39;

/** 引用某个元件的固定端点（如 battery 的 east），导线靠它落到元件边框而非猜中心坐标 */
export const at = (id: string, anchor: IRAnchorRef): IRNodeTarget => ({ id, anchor });

const anchorPoint = (rect: Rect, x: number, y: number): Position => localToWorld(rect, [x, y]);

const boxAnchor = (rect: Rect, name: string): Position | undefined => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  switch (name) {
    case 'center':
      return anchorPoint(rect, 0, 0);
    case 'north':
      return anchorPoint(rect, 0, -halfHeight);
    case 'south':
      return anchorPoint(rect, 0, halfHeight);
    case 'east':
      return anchorPoint(rect, halfWidth, 0);
    case 'west':
      return anchorPoint(rect, -halfWidth, 0);
    case 'north-east':
      return anchorPoint(rect, halfWidth, -halfHeight);
    case 'north-west':
      return anchorPoint(rect, -halfWidth, -halfHeight);
    case 'south-east':
      return anchorPoint(rect, halfWidth, halfHeight);
    case 'south-west':
      return anchorPoint(rect, -halfWidth, halfHeight);
    default:
      return undefined;
  }
};

const horizontalTerminalAnchor = (rect: Rect, name: string): Position | undefined => {
  if (name === 'input') return boxAnchor(rect, 'west');
  if (name === 'output') return boxAnchor(rect, 'east');
  return boxAnchor(rect, name);
};

/** 电池端点：长板（正极）在右 = east，短板（负极）在左 = west；同时兼容 input / output / 方位名 */
const batteryAnchor = (rect: Rect, name: string): Position | undefined => {
  if (name === 'positive') return boxAnchor(rect, 'east');
  if (name === 'negative') return boxAnchor(rect, 'west');
  return horizontalTerminalAnchor(rect, name);
};

const horizontalBoundaryPoint = (rect: Rect, toward: Position): Position => {
  const [localX] = worldToLocal(rect, toward);
  return anchorPoint(rect, localX < 0 ? -rect.width / 2 : rect.width / 2, 0);
};

/**
 * 电池（单电池 cell）：横向标准符号——长板（阳极 / 正极，east）+ 短板（阴极 / 负极，west），左右各一段引线
 * @description 板的长短表极性：阳极板长 = 阴极板的两倍；两板同等细描边（与参考符号表一致，不再额外标 +/-）；
 *   整体相对竖式旋转 90°，落在水平的底部支路上
 */
const circuitBattery: ShapeDefinition = defineShape({
  paramsSchema: z.strictObject({}),
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 8 + BATTERY_LEAD),
    halfHeight: Math.max(innerHalfHeight, 28),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: batteryAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? STROKE_WIDTH;
    const leftX = rect.x - rect.width / 2;
    const rightX = rect.x + rect.width / 2;
    const negativePlateX = rect.x - 8;
    const positivePlateX = rect.x + 8;
    const positiveHalf = rect.height * 0.8;
    const negativeHalf = rect.height * 0.4 - 2;
    const shared = {
      stroke,
      strokeOpacity: style.strokeOpacity,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
      strokeLinecap: 'round' as const,
    };

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(leftX), round(rect.y)] },
        { kind: 'line', to: [round(negativePlateX), round(rect.y)] },
      ],
      strokeWidth,
      ...shared,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(negativePlateX), round(rect.y - negativeHalf)] },
        { kind: 'line', to: [round(negativePlateX), round(rect.y + negativeHalf)] },
      ],
      strokeWidth,
      ...shared,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(positivePlateX), round(rect.y - positiveHalf)] },
        { kind: 'line', to: [round(positivePlateX), round(rect.y + positiveHalf)] },
      ],
      strokeWidth,
      ...shared,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(positivePlateX), round(rect.y)] },
        { kind: 'line', to: [round(rightX), round(rect.y)] },
      ],
      strokeWidth,
      ...shared,
    };
  },
});

/** 开关（断开态）：左右各一段引线 + 两个触点 + 从左触点上翘的拉杆 */
const circuitSwitch: ShapeDefinition = defineShape({
  paramsSchema: z.strictObject({}),
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 22 + SWITCH_LEAD),
    halfHeight: Math.max(innerHalfHeight, 26),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: horizontalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? STROKE_WIDTH;
    const halfWidth = rect.width / 2;
    const contactRadius = 6;
    const leftContactX = rect.x - (halfWidth - SWITCH_LEAD);
    const rightContactX = rect.x + (halfWidth - SWITCH_LEAD);
    const leverEnd: Position = [round(rightContactX), round(rect.y - rect.height * 0.45)];
    const shared = { stroke, strokeWidth, opacity: style.opacity, strokeOpacity: style.strokeOpacity };

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - halfWidth), round(rect.y)] },
        { kind: 'line', to: [round(leftContactX - contactRadius), round(rect.y)] },
      ],
      strokeLinecap: 'round',
      ...shared,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rightContactX + contactRadius), round(rect.y)] },
        { kind: 'line', to: [round(rect.x + halfWidth), round(rect.y)] },
      ],
      strokeLinecap: 'round',
      ...shared,
    };
    yield { type: 'ellipse', cx: round(leftContactX), cy: round(rect.y), rx: contactRadius, ry: contactRadius, fill: 'none', ...shared };
    yield { type: 'ellipse', cx: round(rightContactX), cy: round(rect.y), rx: contactRadius, ry: contactRadius, fill: 'none', ...shared };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(leftContactX + contactRadius), round(rect.y - 2)] },
        { kind: 'line', to: leverEnd },
      ],
      strokeLinecap: 'round',
      ...shared,
    };
  },
});

/** 定值电阻（IEC / 英式）：一个矩形框 + 左右两段引线 */
const circuitResistor: ShapeDefinition = defineShape({
  paramsSchema: z.strictObject({}),
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 52 + RESISTOR_LEAD),
    halfHeight: Math.max(innerHalfHeight, 24),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: horizontalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? STROKE_WIDTH;
    const halfWidth = rect.width / 2;
    const bodyHalfWidth = halfWidth - RESISTOR_LEAD;
    const bodyHalfHeight = 16;

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - halfWidth), round(rect.y)] },
        { kind: 'line', to: [round(rect.x - bodyHalfWidth), round(rect.y)] },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
    yield {
      type: 'rect',
      x: round(rect.x - bodyHalfWidth),
      y: round(rect.y - bodyHalfHeight),
      width: round(bodyHalfWidth * 2),
      height: round(bodyHalfHeight * 2),
      fill: 'none',
      stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
      opacity: style.opacity,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x + bodyHalfWidth), round(rect.y)] },
        { kind: 'line', to: [round(rect.x + halfWidth), round(rect.y)] },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
  },
});

/** 滑动变阻器（IEC variable resistor）：与定值电阻完全一致的矩形框 + 左右引线，额外多一条斜穿箭头表"可调" */
const circuitRheostat: ShapeDefinition = defineShape({
  paramsSchema: z.strictObject({}),
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 52 + RESISTOR_LEAD),
    halfHeight: Math.max(innerHalfHeight, 24),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: horizontalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? STROKE_WIDTH;
    const halfWidth = rect.width / 2;
    const bodyHalfWidth = halfWidth - RESISTOR_LEAD;
    const bodyHalfHeight = 16;
    const tipX = rect.x + 42;
    const tipY = rect.y - bodyHalfHeight - 21.5;

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - halfWidth), round(rect.y)] },
        { kind: 'line', to: [round(rect.x - bodyHalfWidth), round(rect.y)] },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
    yield {
      type: 'rect',
      x: round(rect.x - bodyHalfWidth),
      y: round(rect.y - bodyHalfHeight),
      width: round(bodyHalfWidth * 2),
      height: round(bodyHalfHeight * 2),
      fill: 'none',
      stroke,
      strokeWidth,
      opacity: style.opacity,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x + bodyHalfWidth), round(rect.y)] },
        { kind: 'line', to: [round(rect.x + halfWidth), round(rect.y)] },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
    // 斜穿箭头：左下 → 右上
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - 42), round(rect.y + bodyHalfHeight + 21.5)] },
        { kind: 'line', to: [round(tipX), round(tipY)] },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
    // 箭头头部
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(tipX - 16), round(tipY + 4)] },
        { kind: 'line', to: [round(tipX), round(tipY)] },
        { kind: 'line', to: [round(tipX - 5), round(tipY + 16)] },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: style.opacity,
    };
  },
});

/**
 * 把一个形状 emit 出的所有子原语收进单个 group primitive
 * @description 纯几何 Node（无文本、无旋转）默认平铺、不带 `<g>`；包一层 group 让每个电路符号在 SVG 里是一个独立编组，便于审查 / 整体着色
 */
const withGroup = (shape: ShapeDefinition): ShapeDefinition => ({
  ...shape,
  emit: (rect, style, round, params) => {
    const group: ScenePrimitive = { type: 'group', children: [...shape.emit(rect, style, round, params)] };
    return [group];
  },
});

export const circuitShapes = {
  'circuit-battery': withGroup(circuitBattery),
  'circuit-switch': withGroup(circuitSwitch),
  'circuit-resistor': withGroup(circuitResistor),
  'circuit-rheostat': withGroup(circuitRheostat),
};

/** 电源（电池）：横向符号，长板阳极在右、短板阴极在左；rotate 旋转整只电池（如 90° 竖放） */
export const Battery: FC<{ id?: string; position: Position; rotate?: number; label?: CircuitLabel }> = ({ id, position, rotate, label }) => (
  <Node
    id={id}
    position={position}
    rotate={rotate}
    label={label}
    shape="circuit-battery"
    minimumWidth={118}
    minimumHeight={56}
    stroke={INK}
    strokeWidth={STROKE_WIDTH}
    fill="none"
  />
);

/** 开关（断开态） */
export const Switch: FC<{ id?: string; position: Position; label?: CircuitLabel }> = ({ id, position, label }) => (
  <Node id={id} position={position} label={label} shape="circuit-switch" minimumWidth={156} minimumHeight={52} stroke={INK} strokeWidth={STROKE_WIDTH} fill="none" />
);

/** 定值电阻 */
export const Resistor: FC<{ id?: string; position: Position; label?: CircuitLabel }> = ({ id, position, label }) => (
  <Node id={id} position={position} label={label} shape="circuit-resistor" minimumWidth={182} minimumHeight={48} stroke={INK} strokeWidth={STROKE_WIDTH} fill="none" />
);

/** 滑动变阻器：尺寸与定值电阻一致 */
export const Rheostat: FC<{ id?: string; position: Position; label?: CircuitLabel }> = ({ id, position, label }) => (
  <Node id={id} position={position} label={label} shape="circuit-rheostat" minimumWidth={182} minimumHeight={48} stroke={INK} strokeWidth={STROKE_WIDTH} fill="none" />
);
