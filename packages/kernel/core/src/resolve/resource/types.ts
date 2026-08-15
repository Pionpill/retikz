import type {
  ClipDefinition,
  PatternDefinition,
  ResolvedPatternLineStyle,
  ResolvedPatternLineStyleCycle,
} from '../../contract';
import type { IRClipSpec, IRJsonObject, IRPaintSpec, IRPatternPaintSpec } from '../../schemas';

/** 已在 resolve 阶段绑定的 pattern 线型数据 */
export type PatternStyleResolution = Readonly<{
  /** 顶层基础线型 */
  base: ResolvedPatternLineStyle;
  /** horizontalStyle 继承基础线型后的结果 */
  horizontalStyle?: ResolvedPatternLineStyle;
  /** verticalStyle 继承基础线型后的结果 */
  verticalStyle?: ResolvedPatternLineStyle;
  /** lineStyleCycle 展开后的完整周期 */
  lineStyleCycle?: ResolvedPatternLineStyleCycle;
}>;

/** 已完成 provider 选择、默认值和样式 shaping 的 pattern */
export type PatternResolution = Readonly<{
  /** 保留原始 paint spec，供资源去重和 Scene materialization 使用 */
  spec: IRPatternPaintSpec;
  /** 实际绑定的 provider 名称 */
  name: string;
  /** 已绑定的 pattern provider */
  definition: PatternDefinition;
  /** 应用 provider 默认值后的基础尺寸 */
  size: number;
  /** 已完成样式继承与 preset 展开的线型数据 */
  style: PatternStyleResolution;
}>;

/** 已在 resolve 阶段确定的 paint resource 输入 */
export type PaintResolution = Readonly<{
  /** 内部 discriminator，不属于持久化 IR */
  kind: 'paint';
  /** 原始 paint spec */
  spec: IRPaintSpec;
  /** pattern paint 的 provider 和样式解析结果 */
  pattern?: PatternResolution;
}>;

/** resolve 阶段可以产生的 paint 值 */
export type PaintResolutionInput = string | PaintResolution;

/** 已绑定 clip provider 且完成 schema params 解析的 clip */
export type ClipResolution = Readonly<{
  /** 原始 clip spec，供递归解析与错误定位使用 */
  spec: IRClipSpec;
  /** 实际绑定的 provider key */
  kind: string;
  /** 已绑定的 clip provider */
  definition: ClipDefinition;
  /** provider schema parse 后的 JSON params */
  params: IRJsonObject;
  /** 递归解析嵌套 clip，闭包捕获同一有效 registry */
  resolve: (clip: IRClipSpec) => ClipResolution;
}>;
