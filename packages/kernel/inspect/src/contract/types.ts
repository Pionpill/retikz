import type {
  CompileResult,
  CompositeArtifact,
  CoreSemanticColors,
  CssColorValue,
  IRChild,
  ScenePrimitive,
} from '@retikz/core';
import type { JsonObject, JsonValue } from '@retikz/foundation';
import type { AffineMatrix } from '@retikz/math';
import type { ZodType } from 'zod';

/** 编译结果的递归只读视图，不改变原对象 */
type InspectionJsonValue =
  | null
  | string
  | number
  | boolean
  | ReadonlyArray<InspectionJsonValue>
  | { readonly [key: string]: InspectionJsonValue };

/** 已知对象递归只读，JSON 开放值保留递归边界 */
export type InspectionReadonly<T> = JsonValue extends T
  ? InspectionJsonValue
  : T extends object
    ? { readonly [K in keyof T]: InspectionReadonly<T[K]> }
    : T;

/** 注册表中的检查器标识 */
export type InspectorKey = Readonly<{ namespace: string; type: string }>;

/** 当前结果内的图元路径或领域产物下标，不是跨版本身份 */
export type InspectionTarget =
  | Readonly<{ kind: 'primitive'; path: ReadonlyArray<number> }>
  | Readonly<{ kind: 'artifact'; index: number }>;

/** 检查器消费的公开编译对象类别 */
export type InspectorSubject =
  | Readonly<{ kind: 'primitive'; type: ScenePrimitive['type'] }>
  | Readonly<{ kind: 'artifact'; namespace: string; type: string }>;

/** 依据声明的对象类别取得回调输入 */
export type InspectorSubjectValue<
  TSubject extends InspectorSubject,
  TValue extends JsonValue = JsonValue,
> = TSubject extends { kind: 'primitive'; type: infer TType }
  ? InspectionReadonly<Extract<ScenePrimitive, { type: TType }>>
  : TSubject extends { kind: 'artifact'; namespace: infer TNamespace extends string; type: infer TType extends string }
    ? InspectionReadonly<CompositeArtifact<TNamespace, TType, TValue>>
    : never;

/** 辅助内容坐标约定 */
export type InspectorCoordinateSpace = 'local' | 'scene';

/** 由普通 Core 编译独立处理的辅助输入 */
export type InspectorFragment = Readonly<{ coordinateSpace: InspectorCoordinateSpace; child: IRChild }>;

/** 空数组表示没有可绘制的辅助内容 */
export type InspectorOutput = ReadonlyArray<InspectorFragment>;

/** 辅助编译环境提供的色彩，不读取主图对象主题 */
export type InspectionAppearanceContext = Readonly<{
  /** 请求及目标顺序确定的颜色序号 */
  colorScope: number;
  /** 当前对象的辅助绘图颜色 */
  scopeColor: CssColorValue;
  /** 辅助环境的共享语义色板 */
  semanticColors: InspectionReadonly<CoreSemanticColors>;
}>;

/** 扩展只能读取当前快照；领域产物不具有隐式空间变换 */
export type InspectorContext<
  TOptions extends JsonObject = JsonObject,
  TSubject extends InspectorSubject = InspectorSubject,
> = Readonly<{
  /** 当前检查器的注册键 */
  inspectorKey: InspectorKey;
  /** 当前快照内的对象定位 */
  target: InspectionTarget;
  /** 与调用方隔离的递归只读编译结果 */
  result: InspectionReadonly<CompileResult>;
  /** 已应用 schema 默认值与变换的独立选项 */
  options: InspectionReadonly<TOptions>;
  /** 辅助绘图色彩，不读取主图对象的主题 */
  appearance: InspectionAppearanceContext;
  /** 报告非致命缺口；不会中止其他受支持输出 */
  warn: (code: string, message: string) => void;
}> &
  (TSubject extends { kind: 'primitive' } ? Readonly<{ transform: AffineMatrix }> : Readonly<{ transform?: never }>);

/** 内置与第三方共用的检查器定义 */
export type InputInspectorDefinition<
  TSubject extends InspectorSubject = InspectorSubject,
  TOptions extends JsonObject = Record<string, never>,
  TValue extends JsonValue = JsonValue,
> = InspectorKey &
  Readonly<{
    /** 图元种类或领域产物的 namespace/type */
    subject: TSubject;
    /** 请求入口的选项解析；省略时仅接受空对象 */
    optionsSchema?: ZodType<TOptions>;
    /** 将当前对象转换为普通辅助 IR；空数组表示无输出 */
    inspect: (
      subject: InspectorSubjectValue<TSubject, TValue>,
      context: InspectorContext<TOptions, TSubject>,
    ) => InspectorOutput;
  }>;

/** 注册时补全选项契约后的异构定义；回调参数由 subject 与选项解析恢复 */
export type AnyInspectorDefinition = InspectorKey &
  Readonly<{
    subject: InspectorSubject;
    optionsSchema: Readonly<{ parse: (input: unknown) => JsonObject }>;
    inspect: (subject: never, context: never) => InspectorOutput;
  }>;

/** 注册表接受的异构定义 */
export type InputAnyInspectorDefinition = Omit<AnyInspectorDefinition, 'optionsSchema'> &
  Partial<Pick<AnyInspectorDefinition, 'optionsSchema'>>;
