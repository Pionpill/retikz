# ADR-03：移除内置 ternary2D 并保留自定义坐标扩展路径

- 状态：Accepted
- 决策日期：2026-07-27
- 关联：[plot v0.1-beta.2 roadmap](./roadmap.md) · [Visualization Complete](../../../../../architecture/plot-visualization-complete.md) · 被替代：[alpha.9 ADR-03](../alpha.9/03-ternary2d.md) / [alpha.9 ADR-04](../alpha.9/04-dsl-docs.md)

## 背景与目标

`ternary2D` 曾作为内置三变量约束投影进入 Plot：它拥有专用坐标判别值、三角色投影、三角轴、mark 分支以及 React / Vanilla authoring 表面。随后建立的 coordinate definition / registry 已经能用统一契约声明任意位置角色、投影 frame、role scale、曲线轴与 cell 几何，三变量投影不再需要作为 Plot 内置坐标系才能成立。

Plot v0.1 stable 只保留能够代表当前通用坐标主干的内置能力。继续内置 `ternary2D` 会把专用角色、guide 几何和 mark 适配矩阵固化进公共 IR 与三包表面，同时与已经开放的自定义坐标扩展链重复。目标是在 stable 前收窄内置契约，并保留三变量及其它特殊投影的统一扩展能力。

## 决策：删除内置 ternary2D，特殊投影统一走 CoordinateDefinition

`ternary2D` 不再属于 Plot 的内置 coordinate union、内置 definition 集合或专用 lowering。内置坐标系固定为 `cartesian2D`、`polar2D`、`cartesian1D` 与 `polar1D`；三变量投影如仍有需求，由宿主注册自定义 `CoordinateDefinition`，明确声明角色、operation schema、投影、可选 guide 与 cell 几何能力。

同时删除只服务内置 ternary 的三角轴、重心归一化、专用 interval / reference 下沉和 authoring 入口。通用的 N-role frame、开放 position encoding、custom axis、coordinate registry、provenance 与 locator 链路继续保留。

理由：

1. 内置坐标系应代表 Plot 稳定主干，而不是为低复用的单一投影长期承担专用 IR、guide 与 mark 矩阵
2. `CoordinateDefinition` 已提供内置与自定义同路的 schema、registry、resolve、diagnostics 和 lowering 闭环，移除内置项不会迫使用户绕过 Plot 或创建平行模型
3. v0.1 仍处于 0.x 契约收敛期，直接移除错误的稳定承诺优于保留 legacy alias 或无维护保证的半内置能力

## 基础数据结构与公开契约

本决策不新增 IR、contract 或 registry。稳定契约是：

```ts
type BuiltinCoordinateType = 'cartesian2D' | 'polar2D' | 'cartesian1D' | 'polar1D';

type CustomCoordinateOperation = {
  type: string;
  [config: string]: JsonValue;
};
```

自定义 operation 的 `type` 必须是非空、非内置且非保留标识，并通过运行时注入的 `CoordinateDefinition` 校验和解析。definition 声明非空且不重复的位置角色；mark encoding 以同名 role 提供通道，frame 通过 `projectRoles` 投影到二维屏幕空间。guide 维度、role scale、cell 几何和诊断仍由同一 definition 契约闭环。

删除后，`ternary2D` 不再是内置或保留标识。未注入同名 definition 的旧 operation 会在 lowering 查表时 fail-loud；宿主若显式注册同名 definition，它只代表用户自定义坐标能力，不恢复已删除的内置语义。

## 行为、失败语义与兼容性

- 默认行为：Plot 不再提供三元重心归一化、三角 plot area、三角轴或三向网格；其它四种内置坐标行为不变
- 失败与诊断：旧 `ternary2D` operation 没有同名自定义 definition 时，以未注册 coordinate type 失败；自定义 definition 的缺失角色、重复角色、非法 guide 维度和不支持的 cell mark 继续使用统一 fail-loud 诊断
- 兼容性 / breaking：这是 0.x breaking change，不保留 deprecated alias、隐式迁移或旧内置 fallback。原内置 `ternary2D` IR、三角轴和专用 mark 语义均不再受支持
- React / Vanilla 等价性：React 不再接受内置 `coordinate="ternary2D"`；`PointMark.z` 仅保留为自定义坐标可消费的第三位置 role，不代表内置 ternary。Vanilla 不再直接渲染旧内置 spec；两套入口都通过相同的 coordinate definitions 和 Plot lowering 使用自定义坐标

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete；收窄 Plot 内置坐标集合，同时保留特殊投影的通用扩展能力
- 主责包与协作包：`@retikz/plot` 拥有 coordinate IR、definition / registry 与 lowering；plot-react / plot-vanilla 只负责等价 authoring 与 runtime 注入；Data、Core 和 renderer 不拥有 ternary 语义
- 拥有：四种内置坐标、开放 custom coordinate operation、N-role frame、统一 guide / mark / locator 消费链
- 不拥有：内置三元统计归一化、三角轴视觉规范、业务领域的 ternary preset 或 renderer 特判
- 外部扩展与下游闭环：自定义 definition 与内置 definition 同路进入 registry，由 Plot pipeline 解析为 Core IR；adapter 只传递 JSON operation 与运行时 definition，renderer 只消费 Core Scene
- 不支持边界：不提供 turnkey ternary definition、旧 spec 迁移器或旧内置视觉结果兼容保证

## 长期边界

- 提供官方或社区 turnkey ternary CoordinateDefinition
- 改变开放 position role、custom axis、cell geometry、provenance 或 locator 契约
- 增删其它内置坐标系
- 为旧 `ternary2D` spec 提供自动迁移或视觉等价保证
