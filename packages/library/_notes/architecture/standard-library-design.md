# Standard Drawing Library 设计

> **状态：长期边界已确认，alpha.1 基线已实现。** `@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 已组成独立 lockstep release group，并以同一公开 Core 扩展路径提供 Grid、Axes、Frame、capability module / bundle / preset、React JSX 与 Vanilla authoring。本文只维护长期准入与依赖边界；具体 schema、API 和新增能力以对应 milestone ADR 与当前公开契约为准。
>
> 关联：[`packages/library/AGENTS.md`](../../AGENTS.md) · [`Standard v0.1 roadmap`](../decisions/standard/v0/v0.1/roadmap.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md)

---

## 定位

Library 是 Retikz 在 Core 之上的官方通用绘图能力库分组，不是 Core 扩展机制的替代品。Core 保持必要的 IR、definition / registry 契约、compile 与 Scene 真源；`@retikz/standard` 用这些公开契约为作者与 Plot、Table 等官方 Tier 2 包提供常用、可按需导入的定义和通用绘图 composite。

`standard` 的“标准”表示官方维护且适合跨领域重复使用，不表示默认内置、自动全局注册或必须随 Core 安装。直接作者选择 definition、factory、composite 或 preset 后显式注入现有 Core / adapter 入口；官方 Tier 2 包也可以声明依赖所需 capability，并通过自己的 bundle / compile 入口显式接入。

## 可选加载与横向扩展

`packages/library/` 下的包、能力和 preset 相对 Core、renderer 与基础 adapter 保持可选，不成为它们的默认依赖。直接使用方按需安装并通过显式 capability module、部分 preset 或 all preset 动态接入；Plot、Table 等官方 Tier 2 包可以把所需 Standard capability 作为正常声明依赖，但仍须通过显式 bundle / compile 组合接入，不得依赖 import 副作用、module-level 全局 registry 或由 Core 反向自动加载。

Library 的职责是在既有 Drawing Complete 机制上横向增加可复用能力：提供更多官方 definition、factory、composite 与 Sugar 组合，而不向 Core 迁入新的默认基础图元、平行 IR、Scene 语义或 renderer 分支。Core 继续保持最小且完整的基础表达与扩展合同；Library 只消费这些公开入口，领域包则先完成自身语义解析，再把领域无关的绘图输入交给 Standard。

## 边界

进入 Standard 的能力必须同时满足：

1. 移除 Plot、Table、Graph、Flow、Workspace 等领域词汇后仍然成立
2. 至少有两个独立消费场景，不能只是某个 demo 或单一 adapter 的便捷包装
3. 通过既有 Core `defineXxx`、registry、compile options 或 CompositeDefinition / lowering 契约闭环
4. 持久化输入保持 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不进入公开输入
5. React 与 Vanilla 能表达同一宿主无关语义，或 ADR 明确说明某入口不适用

当前已验证 Grid、Axes 与 Frame 这类具有 JSON-safe 持久化语义的通用 Tier 2 composite；v0.1 已规划 Box Layout 与跨 Plot/Table 复用的 Legend 呈现。后续候选包括可选箭头 / shape / connector 定义；是否进入 Standard、是否需要独立 schema，仍由对应能力 ADR 判断。

以下内容不得进入 Standard：数据字段与 scale、表格结构、Plot/Table 的 legend 解析与绑定、Node / Port / Edge / Group 关系模型、算法布局与路由策略、selection / history / viewport、renderer 执行语义，以及 Core 已不可缺少的基础图元。

## 官方 Tier 2 包协作

Plot、Table 等官方 Tier 2 包可以依赖 Standard，但只能消费已经移除领域词汇的公开 capability。领域包负责把 channel、scale、visual encoding、formatter、theme、provenance、locator 与交互意图解析为 Standard 输入；Standard 负责通用 schema、呈现语义、布局、lowering 与领域无关 artifact，不读取或反向导出领域契约。

这条依赖是单向的：`plot / table -> standard -> core / math`。Standard 不依赖 Data、Plot、Table 或其它领域 feature，领域包也不得通过 Standard barrel 转手导出其公共 API。相同 Standard capability 被直接作者和多个领域包消费时，应进入同一 definition / capability module / compile 路径；传递加载、重复 module 与重复 provider key 的精确诊断由对应 capability ADR 冻结，不通过隐式全局注册解决。

## 包家族与依赖

```text
@retikz/standard
  ├─ 按需 definition / factory / composite
  ├─ JSON-safe schema、contract、provider、pipeline / lowering
  └─ 显式 preset

@retikz/standard-react ──→ @retikz/standard + @retikz/react
@retikz/standard-vanilla ─→ @retikz/standard + @retikz/vanilla
```

`standard` 不依赖 adapter、renderer 或领域 feature package。两个 adapter 不复制 Standard 的 schema、definition、registry、layout 或 lowering；它们只负责 authoring 输入、宿主生命周期与输出接线。领域 feature package 可以按兼容版本依赖 `standard`，但不能改变 Standard 三包自己的 lockstep 发布边界。

## 发布与演进

三包使用独立 `standard` release group 并保持组内 lockstep。Plot、Table 等 feature group 使用兼容版本单向依赖所需 Standard capability；Standard 不反向依赖或与领域 feature lockstep。

alpha.1 已完成 package manifest、版本起点、根入口、首批能力、发布配置和用户文档闭环。新增能力继续由对应 milestone ADR 冻结 schema、definition、lowering、adapter、测试与文档；本文不维护具体功能清单或重复公开字段。
