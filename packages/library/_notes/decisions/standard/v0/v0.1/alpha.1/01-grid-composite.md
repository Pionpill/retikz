# ADR-01：将 Grid 迁移为 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

原 `<Grid>` 是 `@retikz/react` 的 Sugar，只在 JSX 构建期生成多条 Path。Grid 语义不会进入 IR，因此不能 JSON 持久化、不能由 Vanilla 等价构造，也不能被 Standard capability 显式加载。

Grid 表达“在二维范围内按间距和基准生成规则参考线”的独立绘图语义。它适合以少量 JSON 字段保存，并可完全 lower 为 Core `IRPath`；不需要新的 Core IR、Scene primitive 或 renderer 分支。

## 决策

`@retikz/standard` 拥有 `standard.grid` composite 的 `GridSchema`、`IRGrid`、`GridDefinition`、`createGrid()` 与纯 `lowerGrid()`。持久化输入只保存范围、间距、基准和样式规则，不保存展开后的 Path，也不接受 ReactNode、函数、DOM 或 renderer 状态。

```ts
type IRGrid = {
  namespace: 'standard';
  type: 'grid';
  bounds: { min: [number, number]; max: [number, number] };
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

- `bounds.min` 必须逐轴小于 `bounds.max`；不自动归一化反向 corner，也不增加 `center + size` 变体
- `spacing` 必须为有限正数；number 表示等距，对象表示分轴间距；`origin` 默认使用 `bounds.min`
- 竖线与横线默认都启用，不能同时关闭；`includeBoundary` 默认 `false`
- `major.every` 是正整数，`offset` 默认 `0`，按相对 origin 的格点整数索引判定，补边界线不会改变主线身份
- border 的 `padding`、`order`、`extendLines` 分别默认 `0`、`front`、`false`
- lowering 按“后置边框、竖线、横线、前置边框”的确定顺序输出 Core Path；主线样式覆盖普通线同名字段

`IRStandardPathStrokeStyle` 与 `IRStandardPathBorderStyle` 是 Grid、Axes、Frame 共用的 JSON-safe Path 样式契约。Grid 不拥有私有 registry；`GridDefinition` 通过 Core `CompositeDefinition` 注册，未注册时保留 Core `COMPOSITE_NOT_REGISTERED` 诊断。

### 宿主入口

React `<Grid>` 与 Vanilla `grid()` 接收同一 `GridInput` 并生成同一 `IRGrid`。两者分别通过既有 `EmbeddableTier2Adapter` 与 `VanillaTier2Adapter` 在当前图内贡献同一 `GridDefinition`，不写全局状态。

adapter contribution key 固定为 `standard.grid`，maker 是稳定模块级函数。同图多个 Grid 可以合并，并可与其它 `standard.*` composite 共存。直接 IR、服务端编译或工具链则通过 `GridModule`、部分 bundle 或 `StandardAllPreset` 显式提供 definition。

## 被否决的方案

- 保留 React-only Sugar：无法保存 Grid 语义，也会让 React 与 Vanilla 形成两套能力
- 将 Grid 加入 Core：它是可选的常用绘图语义，不是不可再分的 Kernel primitive
- 沿用旧扁平 props：`major*`、`border*` 前缀会增加持久化和 LLM 编辑噪音
- 为 Grid 建立独立 registry 或自动注册：会与 Core composite registry 形成平行机制和隐式全局状态

## 公开影响与兼容性

- 新增 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla` 的首批 Grid 入口
- BREAKING：删除 `@retikz/react` 的旧 `Grid` export；迁移到 `@retikz/standard-react`
- `corner1/corner2` 改为 `bounds.min/max`，`step/xStep/yStep` 改为 `spacing`，前缀样式改为 `lines.style`、`major.style` 与 `border.style`
- Grid composite 是 JSON-safe Tier 2 IR；lowering 后只产生既有 Core Path

## 最终实现与验证摘要

- Standard 已实现严格 schema、factory、definition、格点枚举与纯 lowering；React / Vanilla adapter 生成等价 IR 并局部贡献同一 definition
- Grid 已从 Kernel React 迁出，双语 Standard 文档、迁移说明、AI JSX parser 与相关示例已同步
- schema、lowering、边界、错误路径、adapter 等价、未注册诊断与多 capability 组合均有自动化测试
- Standard 三包的 lint、类型检查、全量测试和 build 已在 alpha.1 收尾验证通过

## 遗留边界

- 不支持数据 scale、无限或动态 viewport、极坐标 / 对数坐标、target、动画、事件或编辑器状态
- 主线、边框以外的高级参考网格能力继续由后续独立 Standard composite 评估
- 其它 Kernel Sugar 不因本决策迁移；每项能力仍需独立证明所有权与完整 lowering 闭环
