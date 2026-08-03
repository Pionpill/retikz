# ADR-01：将 Grid 迁移为 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 契约增补：2026-08-03
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

原 `<Grid>` 是 `@retikz/react` 的 Sugar，只在 JSX 构建期生成多条 Path。Grid 语义不会进入 IR，因此不能 JSON 持久化、不能由 Vanilla 等价构造，也不能被 Standard capability 显式加载。

Grid 表达“在二维范围内按间距和基准生成规则参考线”的独立绘图语义。它适合以少量 JSON 字段保存，并可 lower 为既有 Core `IRPath`，中心定位复用既有 `IRScope`；不需要新的 Core IR、Scene primitive 或 renderer 分支。

## 决策

`@retikz/standard` 拥有 `standard.grid` composite 的 `GridSchema`、`IRGrid`、`GridDefinition`、`createGrid()` 与纯 `lowerGrid()`。持久化输入只保存范围、中心定位、间距、基准和样式规则，不保存展开后的 Path，也不接受 ReactNode、函数、DOM 或 renderer 状态。

```ts
type IRGrid = {
  namespace: 'standard';
  type: 'grid';
  bounds:
    | { start: [number, number]; end: [number, number] }
    | {
        position: [number, number] | PolarPosition;
        width: number;
        height: number;
      };
  spacing: number | { x: number; y: number };
  origin?: [number, number];
  lines?: {
    vertical?: boolean;
    horizontal?: boolean;
    includeBoundary?: boolean;
    style?: IRStandardPathStrokeStyle;
  };
  major?: { every: number; offset?: number; style?: IRStandardPathStrokeStyle };
  border?: {
    padding?: number;
    order?: 'behind' | 'front';
    extendLines?: boolean;
    style?: IRStandardPathBorderStyle;
  };
};
```

### 输入与 lowering

- `bounds.start` 与 `bounds.end` 是两个无方向的笛卡尔角点；输入不要求顺序，lowering 按 x、y 两轴分别排序，也接受相等坐标
- `bounds.position` 表示几何中心，`width` 与 `height` 是非负尺寸；该变体的格线先在中心局部坐标中生成，再平移到中心
- `bounds.position` 可为笛卡尔 `Position` 或 Core `PolarPosition`。PolarPosition 保留在 IR 中，由 Core Scene compile 解析，支持递归 origin 与节点引用；这只表示笛卡尔 Grid 的中心定位，不引入极坐标网格
- `spacing` 必须为有限正数；number 表示等距，对象表示分轴间距
- `origin` 对 `start/end` 变体使用场景坐标，省略时取归一化后的起点；对中心变体使用相对中心的局部坐标，省略时取 `[-width / 2, -height / 2]`
- `width` 与 `height` 不接受负数；取消的是 `start/end` 的方向 / 大小关系校验，不取消尺寸有限性、spacing 或格点枚举安全限制
- 竖线与横线默认都启用，不能同时关闭；`includeBoundary` 默认 `false`
- `major.every` 是正整数，`offset` 默认 `0`，按相对 origin 的格点整数索引判定，补边界线不会改变主线身份
- border 的 `padding`、`order`、`extendLines` 分别默认 `0`、`front`、`false`
- lowering 按“后置边框、竖线、横线、前置边框”的确定顺序输出 Core Path；中心变体只额外使用既有 Core Scope 平移；主线样式覆盖普通线同名字段

`IRStandardPathStrokeStyle` 与 `IRStandardPathBorderStyle` 是 Grid、Axes、Frame 共用的 JSON-safe Path 样式契约。Grid 不拥有私有 registry；`GridDefinition` 通过 Core `CompositeDefinition` 注册，未注册时保留 Core `COMPOSITE_NOT_REGISTERED` 诊断。

### 宿主入口

React `<Grid>` 与 Vanilla `grid()` 接收同一 `GridInput` 并生成同一 `IRGrid`。两者分别通过既有 `EmbeddableTier2Adapter` 与 `VanillaTier2Adapter` 在当前图内贡献同一 `GridDefinition`，不写全局状态。

adapter contribution key 固定为 `standard.grid`，maker 是稳定模块级函数。同图多个 Grid 可以合并，并可与其它 `standard.*` composite 共存。直接 IR、服务端编译或工具链则通过 `composites: [GridDefinition]` 显式提供 definition

## 被否决的方案

- 保留 React-only Sugar：无法保存 Grid 语义，也会让 React 与 Vanilla 形成两套能力
- 将 Grid 加入 Core：它是可选的常用绘图语义，不是不可再分的 Kernel primitive
- 沿用旧扁平 props：`major*`、`border*` 前缀会增加持久化和 LLM 编辑噪音
- 为 Grid 建立独立 registry 或自动注册：会与 Core composite registry 形成平行机制和隐式全局状态

## 契约增补

本增补替换本 ADR 原先关于 `bounds.min/max`、严格 corner 大小关系、`center + size` 缺失以及极坐标不支持的表述。Grid 的公开范围契约现在有两个互斥变体：无方向的 `start/end` 角点，或 Core `Rect` 语义的中心 `position` 加 `width/height`。`position` 字段统一承载笛卡尔 `Position` 与 `PolarPosition`，不另设 `polarPosition` 字段。

`start/end` 仍限定为笛卡尔位置，因为格线范围和格点枚举必须在 Standard lowering 阶段确定；支持 PolarPosition 角点会要求 Core 提供上下文感知的几何 composite 编译能力，不属于本次增补。中心变体可以先在局部坐标中确定完整笛卡尔格线，再由 Core 解析并应用中心定位，因此不需要 Standard 私有 resolver 或平行 compile pipeline。

中心变体的 `origin` 是相对中心的局部坐标，默认值为局部左上角；`start/end` 变体的 `origin` 保持场景绝对坐标语义，默认值为归一化后的起点。该差异是为了同时保留旧角点形式的对齐能力并支持尚未解析的 PolarPosition 中心，属于公开契约的一部分。

## 公开影响与兼容性

- 新增 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla` 的首批 Grid 入口
- BREAKING：删除 `@retikz/react` 的旧 `Grid` export；迁移到 `@retikz/standard-react`
- `corner1/corner2` 改为 `bounds.start/end`；新增 `bounds.position/width/height` 中心形式；`step/xStep/yStep` 继续使用 `spacing`，前缀样式继续使用 `lines.style`、`major.style` 与 `border.style`
- 旧 `bounds.min/max` 不保留兼容别名；Grid composite 仍是 JSON-safe Tier 2 IR，lowering 只复用既有 Core Path 与 Scope

## 最终实现与验证摘要

- Standard 已实现严格 schema、factory、definition、格点枚举与纯 lowering；React / Vanilla adapter 生成等价 IR 并局部贡献同一 definition
- Grid 已从 Kernel React 迁出，双语 Standard 文档、迁移说明、AI JSX parser 与相关示例已同步
- schema、lowering、边界、错误路径、adapter 等价、未注册诊断与多 capability 组合均有自动化测试；本增补要求为两种 bounds 形态、中心局部 origin 与 Core PolarPosition 解析补齐对应证据
- Standard 三包的 lint、类型检查、全量测试和 build 已在 alpha.1 收尾验证通过

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 中的 Standard 通用 Cartesian Grid composite
- 解决的问题：补齐常用的中心点 + 尺寸表达，并允许无方向角点输入，保持 Grid 语义可持久化、可生成和可跨入口使用
- 主责包与协作包：`@retikz/standard` 主责 schema、definition、factory 与 lowering；Core 主责位置解析和 Scope compile；React / Vanilla 只做等价 authoring
- 是否可由现有能力组合：是。复用 Core Position / PolarPosition schema、IRScope、transform 与 compile，不新增 Core primitive 或 Standard 私有解析链
- 是否需要下沉到依赖能力域：否。本轮只消费已有 Core 位置和 Scope 能力
- 内部表达链路：Grid IR → Standard 数值局部格线 → Core Path；中心定位 → Core Scope translate → Scene
- 外部扩展链路：继续通过既有 `GridDefinition` / Core composite registry / compile options 接入，内置与自定义 Definition 路径不变
- 下游执行 / adapter 等价性：下游仍只接收既有 Core Path / Scope / Scene；React 与 Vanilla 继续生成同一 Grid IR
- 不支持边界与诊断：不支持 PolarPosition 角点和极坐标网格；无效引用沿用 Core unresolved-reference 诊断，未加载 Definition 沿用 `COMPOSITE_NOT_REGISTERED`
- 本轮结论：扩展当前 Standard 能力域，组合现有 Core 能力

## 稳定测试策略

测试需要覆盖两种 bounds 形态、无序角点归一化、中心局部 origin、尺寸与格点安全边界、笛卡尔与递归 / 节点引用 PolarPosition 的 Core compile 结果、既有线 / 主线 / 边框顺序、Definition 诊断，以及 React / Vanilla 输入与 lowering parity。双语 Grid 文档需要与公开 schema 和默认值同步。

## 遗留边界

- 不支持数据 scale、无限或动态 viewport、PolarPosition 角点、极坐标网格、对数坐标、target、动画、事件或编辑器状态
- 主线、边框以外的高级参考网格能力继续由后续独立 Standard composite 评估
- 其它 Kernel Sugar 不因本决策迁移；每项能力仍需独立证明所有权与完整 lowering 闭环
