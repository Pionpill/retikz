import type { ArrowShape } from '../ir/path/arrow';

/**
 * Path 命令：结构化路径绘制操作
 * @description discriminated union 按 kind 分发；坐标 / 角度均使用 user units（角度=度，0=+x、90=+y/视觉下、CW=正）。各 adapter 自行翻译为原生 API：SVG 拼 `d` 字符串、Canvas 调 ctx.moveTo/lineTo/arc 等
 */
export type PathCommand =
  | { kind: 'move'; to: [number, number] }
  | { kind: 'line'; to: [number, number] }
  | { kind: 'quad'; control: [number, number]; to: [number, number] }
  | {
      kind: 'cubic';
      control1: [number, number];
      control2: [number, number];
      to: [number, number];
    }
  | {
      kind: 'arc';
      center: [number, number];
      radius: number;
      startAngle: number;
      endAngle: number;
      counterClockwise?: boolean;
    }
  | {
      kind: 'ellipseArc';
      center: [number, number];
      radiusX: number;
      radiusY: number;
      rotation?: number;
      startAngle: number;
      endAngle: number;
      counterClockwise?: boolean;
    }
  | { kind: 'close' };

/**
 * 端点级解析后的箭头视觉规格（Scene primitive 层）
 * @description compile/path.ts 把 IR `arrowDetail` 顶层 + start/end merge 后产出此结构。`shape` 必填、其余视觉字段全 optional：缺省字段交给 renderer 走 context-stroke / 硬编码 fallback，保持向后兼容
 */
export type ArrowEndSpec = {
  /** 形状名 */
  shape: ArrowShape;
  /** 等比缩放因子（乘到 length/width 上）；缺省 1 */
  scale?: number;
  /** 尖长（user units）；缺省让 renderer 走默认 6 */
  length?: number;
  /** 尖宽（user units）；缺省让 renderer 走默认 6 */
  width?: number;
  /** 描边颜色 override；缺省走 context-stroke（继承 path stroke） */
  color?: string;
  /** 填充色 override（仅实心 shape 生效；空心 shape 已在 compile 阶段被丢） */
  fill?: string;
  /** 箭头不透明度 0..1；缺省继承 path opacity */
  opacity?: number;
  /** 空心 shape 描边粗细（user units）；缺省 1.5。实心 shape 忽略 */
  lineWidth?: number;
};

/** 路径原语：结构化 commands 数组；adapter 在 render 时翻译为各自原生 API */
export type PathPrim = {
  /** 类型判别符 */
  type: 'path';
  /** 结构化路径命令序列，按数组顺序绘制 */
  commands: Array<PathCommand>;
  /** 填充色；不填表示不填充 */
  fill?: string;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** SVG fill-rule：`nonzero`（默认）/ `evenodd`（环形 / 孔洞场景） */
  fillRule?: 'nonzero' | 'evenodd';
  /** 描边色 */
  stroke?: string;
  /** 描边透明度 0~1（SVG stroke-opacity） */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** SVG stroke-dasharray 模式 */
  strokeDasharray?: string;
  /** 端点形状 */
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** 拐点形状 */
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  /** 起点箭头视觉规格；undefined = 无箭头 */
  arrowStart?: ArrowEndSpec;
  /** 终点箭头视觉规格；undefined = 无箭头 */
  arrowEnd?: ArrowEndSpec;
  /** 整体透明度 0~1 */
  opacity?: number;
};
