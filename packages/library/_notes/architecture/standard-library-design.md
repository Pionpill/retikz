# Standard 拓展库设计

> **状态：长期边界已确认；Surface 为 Proposed 扩展。** Standard 三包提供 Grid、Axes、Frame、Legend 等通用绘图能力；Flex / GridLayout / OverlayLayout 已迁入独立 Layout package family，不再属于 Standard。任意 child 的 renderer-neutral Surface 由当前版本 v0.1 alpha.4 冻结。
>
> 关联：[`Library 能力库设计`](./library-design.md) · [`Layout 布局库设计`](./layout-library-design.md) · [`Standard v0.1 roadmap`](../decisions/standard/v0/v0.1/roadmap.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md)

---

## 定位

Standard 是 Retikz 在 Core 之上的官方绘图拓展包家族。它横向提供可按需安装的 definition、factory、简单 Tier 2 composite 与 Sugar，不把这些能力变成 Core 默认内置，也不建立 Standard 私有 IR、Scene、renderer 或全局 registry。

“Standard”表示官方维护、跨领域可复用和拥有稳定公共契约，不表示所有通用能力都必须进入同一包。形成独立纵向模型、求解、artifact 与工具链的能力应拥有自己的 package family；排版布局因此由 Layout 主责。

## 准入边界

进入 Standard 的能力必须同时满足：

1. 移除 Plot、Table、Notation、Graph、Flow、Workspace 等领域词汇后仍成立
2. 解决的是绘图词汇或简单组合缺口，不建立独立的纵向运行模型
3. 通过 Core 既有 definition / registry / composite / lowering 契约闭环
4. 持久化输入保持 JSON-safe，React 与 Vanilla 表达同一宿主无关语义
5. 至少具有两个独立消费场景，或属于官方维护的通用扩展实现

Arrow、Shape、Boundary、Pattern、PathGenerator 等 Definition 和 Grid、Axes、Frame、Legend、Surface 等领域无关绘图 composite 可以进入 Standard。数据解析、图式角色、关系模型、排版 solver、算法布局、编辑器状态与 renderer 执行不得进入 Standard。

## 横向扩展与原子能力

Standard 每项能力直接使用 Core 的同一扩展入口。内置与自定义 Definition 复用相同 contract、registry、冲突诊断与 dispatch；Standard 不提供隐式全量 bundle、module-level 注册或“内置优先”旁路。

多个能力反复组合相同下层契约时，优先由 Core / Math / Layout 等 owner 提供命名原子 capability。Standard 可以组合和收窄公共契约，但不 deep import owner 私有模块、复制 schema / solver 或把单个消费方需要的内部 helper 强行公开。

## 与 Layout 协作

Standard composite 需要排版时，直接依赖 `@retikz/layout` 的公开 composition capability。Legend 仍拥有 title、items / ramp、sample / label、领域无关 artifact 与独立 Definition；Layout 只提供 child probe / placement / replay、排版求解、spacing、clip 与 Layout artifact 原子语义。

Surface 同样只组合 Layout 的 proposal、padding、overflow、content geometry 与 replay 原子。它拥有单一任意 Core child 的背景、边框、圆角和完整 Scope 包装，但不拥有 size / alignment solver、多 child arrangement、Chart canvas token 或 Table panel 语义。

Standard 不通过自己的 barrel 转手导出 Layout API，不保留 `@retikz/standard/layout`、Standard Layout Definition 或 `standard.*Layout` namespace。Layout 的失败与诊断继续沿 Core layout-aware context fail-loud，Standard 不捕获后使用私有降级或 renderer 回读。

## 包家族

```text
@retikz/standard
  ├─ 官方 definition / factory / composite
  ├─ JSON-safe schema、Definition 与 lowering
  └─ 按需 Core capability contribution

@retikz/standard-react ───→ @retikz/standard + @retikz/react
@retikz/standard-vanilla ─→ @retikz/standard + @retikz/vanilla
```

Standard 三包使用独立 release group `standard` 并保持组内 lockstep。宿主无关包可以依赖 Core、Math、Foundation 与 Layout 的公开能力，不依赖 adapter、renderer 或领域 feature；两个 adapter 不复制 Standard 或 Layout 的 schema、solver、registry 与 lowering。

## 领域包协作

Plot、Table、Notation 等领域包先把 channel、scale、表格规则、图式角色、provenance 与交互意图解析为领域无关输入，再分别消费 Standard 与 Layout。Chart / Table 可以把 owner-local theme token 与任意 drawable child 解析为 Surface 输入；Standard 不反向读取领域 IR，不提供领域 adapter，也不成为其它 Library capability 的 re-export 汇总入口。

## 发布与演进

新增 Standard 能力继续由对应 milestone ADR 冻结公共契约、Definition、lowering、adapter、测试与文档。Surface 的现行 Proposed 契约见 [v0.1 alpha.4 ADR-01](../decisions/standard/v0/v0.1/alpha.4/01-arbitrary-child-surface.md)。能力迁出时，旧 ADR 原地保留并标记 Superseded，由新 owner ADR 建立后继映射；不搬动历史文件，也不保留跨 owner alias。

文档站在 Library 模块的 `Standard · 拓展` 分组维护 Standard 自己的介绍、组件、参考与更新日志，不承载 Layout 页面或 Layout release group 日志。

## 非目标

- 排版布局 schema、solver、artifact、inspection 与 adapter
- Tree、Layered、Force、GraphModel、edge routing 与碰撞避让
- Plot / Table 数据语义、Notation 图式语义、领域 provenance 与交互
- Core IR、Scene、renderer、运行时资源或编辑器状态
- 兼容 re-export、双 namespace、隐式全局注册或跨 package 私有导入
