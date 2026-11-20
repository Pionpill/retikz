---
description: Core 提供精确的矩形包络摘要，Weave 根据旧贡献与边界的关系复用 Scope 矩形包络，保持几何、完整输出与事务语义
keywords: Scope、包络、贡献、CompiledScopeGeometry、ScopeCompileContext、prepared、Weave、事务
---

# ADR-088：Scope 矩形包络极值复用

- 状态：Accepted
- 接受日期：2026-11-20
- 决策日期：2026-11-20
- 关联：[版本目标](./roadmap.md)、[057](./057-scope-acyclic-geometry-references.md)、[062](./062-weave-node-state-isolation.md)、[084](./084-weave-prepared-dependency-scheduling.md)、[086](./086-independent-compilation-drivers.md)

## 背景与目标

Scope 更新只重编少量子项时，重新访问全部清洁子布局及组装全部贡献仍会随背景增长。编译次数不能代表读取、复制、投影或完整输出物化的成本。

Scope 聚合应从真实变化子项出发，复用清洁贡献，保持 Core 的包络、坐标投影、排序、名称、资源、诊断与来源语义。先避免不影响边界的更新重复计算清洁几何。子布局收集、数组比较、真实依赖扇出与完整输出物化分别计量，本决策不承诺整个更新与背景规模无关。

## 决策：Core 定义几何摘要，Weave 管理贡献与有效性

Core 提供现有矩形包络的精确摘要操作，不持有节点身份、跨批缓存或树结构。Weave 保存上次矩形的原始极值及既有子布局引用，在候选状态中判断其有效性，不建立子项聚合树。

几何是否可复用由本批实际就绪的 Core 结果决定。通知说明潜在失效，不能代替结果比较或就绪检查；相同输入对象、父级版本和绘制变化均不能单独决定几何有效性。新增读取与动态依赖遵循现有队列和循环检测规则。

矩形摘要只代表其输入几何集合在同一坐标系中的角点极值。匿名 Scope 仍向父级提供既有逐项投影几何；不能先合并局部矩形再变换它以代替逐项投影。有名 Scope 继续提供自身包络几何，保留现有引用规则。圆形包络继续按原顺序消费完整角点集和既有最小圆算法，不使用矩形摘要替代。

Scope 可以保存直接子贡献的只读引用和实际消费所需的聚合摘要，但不在每层复制完整后代输出。此条细化 [086](./086-independent-compilation-drivers.md) 的 Scope 状态约束；事实源仍是子项的 Core 产物和局部贡献。

## 基础数据结构与公开契约

复用 Math 的 `AxisAlignedBounds` 和 Core 的 `CompiledReferenceGeometry`、`CompiledScopeGeometry`，不新增 IR、schema 或几何类型别名。Core 根入口新增以下纯计算能力：

```ts
/** 从有序几何贡献提取当前矩形包络使用的角点极值；空输入返回 undefined */
declare const calculateScopeEnvelopeBounds: (
  layouts: ReadonlyArray<CompiledReferenceGeometry>,
) => Readonly<AxisAlignedBounds> | undefined;

/** 合并同坐标系中先后两段摘要；空摘要为单位元，相等极值保留左段数值 */
declare const mergeScopeEnvelopeBounds: (
  left: Readonly<AxisAlignedBounds> | undefined,
  right: Readonly<AxisAlignedBounds> | undefined,
) => Readonly<AxisAlignedBounds> | undefined;

/** 从已聚合极值生成矩形 Scope 包络；undefined 生成原点零尺寸包络 */
declare const compileScopeRectangleEnvelope: (bounds: Readonly<AxisAlignedBounds> | undefined) => CompiledScopeGeometry;
```

以上为签名说明，输入为已满足 Core 几何契约的产物；不新增外部 JSON 解析入口。摘要只读消费，合并不修改任一输入。`undefined` 表示合法空集合，不表示尚未完成；就绪状态由调度方单独保证。

角点提取复用既有外边界计算和访问顺序，不用绘制 bounds、clip 或 shadow 的可见范围替代引用包络。合并使用原有严格大小比较的极值选择规则，相等时保留声明顺序较早的值，包括正负零。最终中心、尺寸、rotate 和 margin 与原矩形包络一致，不经过中心/尺寸往返转换摘要。

`ScopeCompileContext.layouts` 保持 `ReadonlyArray<CompiledReferenceGeometry>`。有效的 `prepared.layout.overall` 或 `prepared.layout.envelope` 跳过包络计算；空 prepared 对象不表示已有包络。

Weave 按有序布局序列比较变化。仅当变化前贡献严格处于旧包络内部时，才合并新极值；仍在内部时外边界不变。旧贡献触边、新贡献与旧极值相等或布局数量改变时完整重算，确保收缩、删除、声明顺序及正负零结果准确。序列索引只用于本次比较，不是元素身份。旧极值不能由中心和宽高反推，避免舍入误差。

具名 Scope 仅依赖子布局、且变化前后的子贡献都严格在其矩形内部时，子项就绪即可排除本次包络失效，无需收集兄弟布局。其他已触发的失效独立处理。需要重新准备包络时仍承担数组比较与子布局收集成本；不缓存每个子项的摘要，不为了未变化的几何维护树结构。圆形和匿名 Scope 的逐项投影规则不变。

矩形摘要的最终结果通过现有 `PreparedScopeLayout.envelope` 传入 `compileScope`，该槽位及其优先级不改变。圆形仍使用真实几何视图求解；从 rectangle 切换为 circle 时不得将矩形包络当作有效的圆形 prepared 结果。所有模式共用相同角点语义；非增量驱动不建立 Weave 的跨批状态。

## 行为、失败语义与兼容性

- 首次挂载建立完整有效状态；更新只发布就绪候选，扩张、原极值收缩与删除均须得到与完整编译相同的结果。结构增删和声明地址刷新保持原语义，不承诺其成本与背景无关。
- 祖先变换变化须更新受影响的世界几何和外部引用消费者；匿名 Scope 暴露多个实际几何时，相关投影工作可以随真实扇出增长。
- 最终 Scene、资源、诊断、来源、artifacts 与 revision 属于同一候选。绘制顺序及相等 zIndex 的声明顺序不变；资源存在性、诊断顺序/次数/清除和 provenance occurrence 均不得因复用而丢失。
- 共享贡献不得被本轮排序、来源重绑或输出组装修改。prepare 失败丢弃候选，目标 commit 失败恢复旧状态与输出，历史已发布 Scene 保持不变。
- 合法空贡献与未就绪不同。非法引用、真实依赖环和扩展能力错误沿用原有错误边界，不使用旧值或静默全量重试掩盖失败。
- `ScopeCompileContext.layouts` 的既有数组契约不变；新增纯函数不改变 DSL、IR 或宿主输入。
- React、Vanilla、Render 的公开输入和交付协议不改变；仍提交完整结果。完整物化和 provenance 重绑按实际需要执行并计时，不承诺本决策消除其线性成本。完整输入替换仍创建新树。
