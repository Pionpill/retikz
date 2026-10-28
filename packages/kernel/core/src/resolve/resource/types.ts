import type {
  ClipDefinition,
  PatternDefinition,
  CanonicalPatternLineStyle,
  CanonicalPatternLineStyleCycle,
} from '../../contract';
import type { IRClip, IRPaint, IRPatternPaint } from '../../schemas';

/** 图案的基础线型及各方向、周期的线型解析结果 */
export type PatternStyleResolution = Readonly<{
  /** 顶层基础线型 */
  base: CanonicalPatternLineStyle;
  /** 水平线继承基础线型后的样式 */
  horizontalStyle?: CanonicalPatternLineStyle;
  /** 垂直线继承基础线型后的样式 */
  verticalStyle?: CanonicalPatternLineStyle;
  /** 按周期索引补齐的线型序列 */
  lineStyleCycle?: CanonicalPatternLineStyleCycle;
}>;

/** 已绑定图案定义并确定尺寸、线型的图案 */
export type PatternResolution = Readonly<{
  /** 原始图案配置，供资源去重与生成使用 */
  spec: IRPatternPaint;
  /** 实际绑定的图案名称 */
  name: string;
  /** 已绑定的图案定义 */
  definition: PatternDefinition;
  /** 依次取显式值、定义默认值或内置默认值，再舍入后的基础尺寸 */
  size: number;
  /** 已完成继承与虚线简写展开的线型 */
  style: PatternStyleResolution;
}>;

/** 供编译阶段生成绘制资源的解析结果 */
export type PaintResolution = Readonly<
  | {
      /** 标识这是绘制资源解析结果 */
      kind: 'paint';
      /** 原始绘制配置 */
      spec: Exclude<IRPaint, { kind: 'pattern' }>;
    }
  | {
      /** 内部绘制资源分类 */
      kind: 'paint';
      /** 原始图案声明 */
      spec: IRPatternPaint;
      /** 图案定义、尺寸和线型的解析结果 */
      pattern: PatternResolution;
    }
>;

/** 解析后的颜色字符串或绘制资源输入 */
export type InputPaintResolution = string | PaintResolution;

/** 已绑定裁剪定义并通过其 schema 解析的裁剪配置 */
export type ClipResolution = Readonly<{
  /** 原始裁剪配置 */
  spec: IRClip;
  /** 裁剪定义的注册名称 */
  kind: string;
  /** 已绑定的裁剪定义 */
  definition: ClipDefinition;
  /** 裁剪定义的 schema 解析后的完整配置 */
  params: IRClip;
  /** 使用同一注册表解析嵌套裁剪配置 */
  resolve: (clip: IRClip) => ClipResolution;
}>;
