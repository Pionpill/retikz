import type { ResolvedTheme } from '@retikz/core';
import type { GraphDefinitionOptions, IRGraphEntity, IRGraphRelation, IRGroup } from '@retikz/graph';

import type { FlowLayoutEndpoint } from '../../contract';
import type { FlowThemeStyleDefinition } from '../../contract';
import type {
  IRFlowDefaults,
  IRFlowDiagram,
  IRFlowEntity,
  IRFlowEntityLayout,
  IRFlowEntityStyle,
  IRFlowGroup,
  IRFlowLayout,
  IRFlowLayoutIntent,
  IRFlowRelation,
  IRFlowRouting,
} from '../../schemas';

/** Flow Source 中可修复字段的 JSON path */
export type FlowSourcePath = ReadonlyArray<string | number>;

/** 解析一个 Flow Source 所需的 Theme 与开放 definitions */
export type FlowResolveContext = Readonly<{
  /** 当前宿主已经解析的 Core 主题 */
  theme: ResolvedTheme;
  /** 可供当前 Flow 选择的主题样式定义 */
  flowThemeStyles: ReadonlyMap<string, FlowThemeStyleDefinition>;
  /** 解析 Graph 语义投影所使用的扩展定义 */
  graph?: GraphDefinitionOptions;
}>;

/** 解析后的 Flow Entity */
export type CanonicalFlowEntity = Readonly<{
  /** 标识可见的 Flow 实体 */
  type: 'entity';
  /** 作者元素身份，用于引用与布局结果关联 */
  id: string;
  /** 保留作者语义的实体源描述 */
  source: IRFlowEntity;
  /** 交给 Graph 测量与编译的实体投影 */
  graph: IRGraphEntity;
  /** 当前布局作用域中的显式层级约束 */
  rank?: number;
  /** 合并默认与实例覆盖后的 Flow 实体样式 */
  style: IRFlowEntityStyle;
  /** 合并默认与实例覆盖后的实体布局参数 */
  layout: IRFlowEntityLayout;
  /** 实体在作者输入中的定位路径 */
  path: FlowSourcePath;
}>;

/** 解析后投影为 Graph Group 的可见 Flow Group */
export type CanonicalFlowGroup = Readonly<{
  /** 标识具有可见 Graph 外壳的 Flow 分组 */
  type: 'group';
  /** 作者分组身份，可用作关系端点 */
  id: string;
  /** 保留作者语义的分组源描述 */
  source: IRFlowGroup;
  /** 交给 Graph 测量与编译的可见分组投影 */
  graph: IRGroup;
  /** 父布局作用域中的显式层级约束 */
  rank?: number;
  /** 当前分组的有效布局意图 */
  layout: IRFlowLayoutIntent;
  /** 分组内关系可继承的路由覆盖 */
  routing?: IRFlowRouting;
  /** 按直接包含顺序排列的已解析子项 */
  elements: ReadonlyArray<CanonicalFlowElement>;
  /** 分组在作者输入中的定位路径 */
  path: FlowSourcePath;
}>;

/** 解析后只建立固定空间排列的 Flow Layout */
export type CanonicalFlowLayout = Readonly<{
  /** 标识不绘制外壳的固定排列容器 */
  type: 'layout';
  /** 作者容器身份，不作为关系端点 */
  id: string;
  /** 保留作者语义的固定排列源描述 */
  source: IRFlowLayout;
  /** 父布局作用域中的显式层级约束 */
  rank?: number;
  /** 当前容器的有效布局意图 */
  layout: IRFlowLayoutIntent;
  /** 按直接包含顺序排列的已解析子项 */
  elements: ReadonlyArray<CanonicalFlowElement>;
  /** 容器在作者输入中的定位路径 */
  path: FlowSourcePath;
}>;

/** 解析后的 Flow element */
export type CanonicalFlowElement = CanonicalFlowEntity | CanonicalFlowGroup | CanonicalFlowLayout;

/** 解析后的 Flow Relation */
export type CanonicalFlowRelation = Readonly<{
  /** 端点已经解析为布局目标的关系源描述 */
  source: Omit<IRFlowRelation, 'source' | 'target'> & {
    /** 已解析的关系起点布局目标 */
    source: FlowLayoutEndpoint;
    /** 已解析的关系终点布局目标 */
    target: FlowLayoutEndpoint;
  };
  /** 交给 Graph 编译的关系语义投影 */
  graph: IRGraphRelation;
  /** 当前关系的有效路由覆盖 */
  routing?: IRFlowRouting;
  /** 关系在作者输入中的定位路径 */
  path: FlowSourcePath;
}>;

/** Flow Source 与有效配置确定后的内部完整形态 */
export type CanonicalFlowDiagram = Readonly<{
  /** 保留作者语义的完整 Flow 源描述 */
  source: IRFlowDiagram;
  /** 解析后供元素与关系使用的默认片段 */
  defaults: IRFlowDefaults;
  /** 根布局作用域的有效布局意图 */
  layout: IRFlowLayoutIntent;
  /** 根级关系路由覆盖 */
  routing?: IRFlowRouting;
  /** 按根包含顺序排列的已解析元素树 */
  elements: ReadonlyArray<CanonicalFlowElement>;
  /** 保持源声明顺序的已解析关系 */
  relations: ReadonlyArray<CanonicalFlowRelation>;
  /** 以元素身份索引的作者输入定位路径 */
  elementPaths: ReadonlyMap<string, FlowSourcePath>;
}>;
