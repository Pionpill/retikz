# ADR-01：Core 通用 IRChild 受约束布局前置门禁

- 状态：Accepted
- 决策日期：2026-07-23
- 修订日期：2026-07-26
- 关联：[table v0.1 roadmap](../roadmap.md) · [Kernel layout-aware composite ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md) · [Core 绘图完备设计](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

alpha.1 只支持固定 `columnWidth` / `rowHeight`。alpha.2 的 auto / minmax 轨道、文本换行、自动行高、span 和 bounds-aware alignment，需要 Cell 中任意合法 `IRChild` 的自然尺寸与给定宽度上限后的最终尺寸。

任意图形内容的布局、visual bounds 与最终 compile 一致性属于 Core。Table 自建 measurer、按 namespace 特判或 deep import Core compile，都会形成平行底座。

Kernel v0.5-alpha.1 ADR-07 已提供 layout-aware composite、`layoutChild()`、双 bounds、one-use replay、typed artifact 与 occurrence locator；随后补齐 `context.replay()`、递归 `context.scope()` 和 callback-local opaque output child，使 replay 可被带 clip / id / meta 的两层 Cell Scope 包装。Table 的 Core 前置条件至此闭合。

## 决策：接受 Core layout-aware composite 作为唯一布局底座

Table alpha.2 只消费以下 Core 公共合同：

1. `CompositeDefinition` 继续复用唯一 `defineComposite()` / registry，并以互斥的 `expand | compile` 分支区分结构 lowering 与完整布局编译
2. `layoutChild()` 支持 `intrinsic` 与 `constrained(maxWidth)`；固定内容允许超过 `maxWidth`，不视为布局失败
3. Table 先求列宽，再用 constrained 结果的自然高度求行高；本里程碑不要求 height constraint 或第二套纵向 reflow
4. `allocationBounds` 与 `visualBounds` 位于 replay root 局部坐标，分别服务轨道分配 / alignment 与 fit / overflow / clip / manifest
5. replay 只能在创建它的同一次 `compileToScene()`、同一个 composite callback 中使用一次；discarded probe 不发布 resource、warning、namespace 或 artifact
6. `context.replay(result, transforms?)` 与 `context.scope(props, children)` 构成 compile-local wrapper tree，可表达“外层 clip/meta Scope → 内层数值变换 Scope → replay”，不得重新 layout 原 child
7. `compileToScene()` 返回 `{ scene, artifacts }`；Table 复用 composite occurrence artifact，不新增 Scene metadata side channel 或平行 artifact API
8. React 通过现有 composites / `onArtifacts`，Vanilla 通过同次 compile / view artifacts 接线；共同可表达的输入固定等价条件，不要求不同 host measurer 产生相同数值
9. 非法 constraint、reference、cycle/depth、artifact 或 replay 生命周期必须 fail-loud；Coordinate、空 Scope 与空输出仍可返回合法零面积
10. Table 只从 `@retikz/core` 公共 owner barrel 消费能力，不依赖 DOM、renderer、Plot 或 `src/compile/**`

接入顺序固定为：

```text
intrinsic layout
  → 求列宽
  → constrained(maxWidth)
  → 求自然行高与 Cell box
  → scope(clip/meta/transforms, replay)
  → Scene + composite artifact
```

理由：

1. Core 是任意 `IRChild` 布局、bounds、replay 与 artifact 的唯一 owner
2. 单向“列宽约束 → 内容自然高度 → 行高”已闭合 alpha.2，不需要把 Core 扩成通用二维容器布局
3. compile-local wrapper tree 保证测量结果、最终 Scene 与 artifact 同源，同时保持 renderer-agnostic

## 否决方案

- Table 私有文字 / 图形 measurer：会复制 Core 语义并按内容类型分叉
- 把原 child 放回普通 Scope 后重新 layout：无法保证 probe 与最终输出同源
- `compileWithArtifacts()`、`channel/owner`、`onCompileResult`、`sourceRootOwners` 或 Scene meta side channel：与最终 Core artifact 合同重复
- height constraint、跨 compile replay/cache：alpha.2 不需要，且会扩大 Core 生命周期与失效合同

## DSL / API 表面

本 ADR 不新增 Table DSL、schema 或公开 API。auto / minmax 轨道、Cell policy、manifest payload 与 React / Vanilla authoring 分别由 ADR-02～07 冻结。

## 测试证据

Core 正式测试覆盖：

- Node、Path、Coordinate、Scope、空输出与 nested composite 的 intrinsic / constrained 结果
- 文本换行、固定内容 overflow、双 bounds 与最终 replay 一致性
- discarded probe 隔离、两层 Scope wrapper、resource / namespace / occurrence / artifact 同源
- 非法 constraint、reference、cycle/depth、artifact 与 replay 生命周期失败
- React / Vanilla 同次 artifact 观察且不触发第二次 compile

行为真源位于 `packages/kernel/core/tests/compile/layout-aware-composite*.test.ts` 与 `layout-aware-wrapper.test.ts`。

## 影响

- ADR-02 可以开始 Table track schema 与 solver 实现；ADR-02～07 只能消费本 ADR 接受的 Core 公共合同
- Core 继续负责通用 child layout / replay / artifact，Table 只负责轨道、Cell box、fit、border 与 manifest payload
- 本 ADR 本身不修改产品代码、schema 或用户文档；后续用户可见 Table 能力仍须同步 zh / en

## 能力完备性检查

- 能力域：Tabular Visualization Complete / Layout，依赖 Drawing Complete / layout-aware composite
- 主责：Core 拥有通用 child layout、bounds、replay 与 artifact；Table 拥有二维布局策略
- 表达链路：Core `layoutChild` → Table solver / Cell policy → compile-local scope / replay → Scene + artifact
- 扩展链路：内置与自定义 composite 共享 `defineComposite` / registry / dispatch
- adapter：React / Vanilla 只接线，不复制布局算法或二次 compile
- 结论：接受现有 Core 组合能力；不新增 Table 私有 fallback

## 不在本 ADR 范围

- 修改 Core contract、compile、React 或 Vanilla 产品代码
- Table track schema、solver、span、border、fit / overflow / clip、manifest payload 和 authoring 的具体设计
- 扩展 React Layout 为完整 `CompileOptions` 宿主入口
- height constraint、跨 compile replay/cache，以及 formatter / theme、group / summary、pivot、多层 header、fragmentation 与 virtual scroll

## 实现记录

最终合同以 Core 公共类型、compile 实现和上述正式测试为准；本 ADR 的 Proposed 施工契约保留在 git 历史中。
