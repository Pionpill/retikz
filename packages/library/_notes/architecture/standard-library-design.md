# Standard Drawing Library 设计

## 定位

Library 是 Retikz 的官方可选绘图能力库分组，不是 Core 扩展机制的替代品。Core 保持必要的 IR、definition / registry 契约、compile 与 Scene 真源；`@retikz/standard` 用这些公开契约提供常用、可按需导入的定义和通用绘图 composite。

`standard` 的“标准”表示官方维护且适合重复使用，不表示默认内置、自动全局注册或必须随 Core 安装。用户选择 definition、factory、composite 或 preset 后，才把它们显式注入现有 Core / adapter 入口。

## 边界

进入 Standard 的能力必须同时满足：

1. 移除 Plot、Table、Graph、Flow、Workspace 等领域词汇后仍然成立
2. 至少有两个独立消费场景，不能只是某个 demo 或单一 adapter 的便捷包装
3. 通过既有 Core `defineXxx`、registry、compile options 或 CompositeDefinition / lowering 契约闭环
4. 持久化输入保持 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不进入公开输入
5. React 与 Vanilla 能表达同一宿主无关语义，或 ADR 明确说明某入口不适用

典型候选包括可选箭头 / shape / connector 定义、`Grid` 这类纯绘图 Sugar 的跨入口等价表达，以及 Frame、Stack、Align / Distribute 等不理解领域模型的 composite。具体候选是否进入、是否只作为 Sugar、是否需独立 schema，都由后续 ADR 判断。

以下内容不得进入 Standard：数据字段与 scale、表格结构、Node / Port / Edge / Group 关系模型、算法布局与路由策略、selection / history / viewport、renderer 执行语义，以及 Core 已不可缺少的基础图元。

## 包家族与依赖

```text
@retikz/standard
  ├─ 按需 definition / factory / composite
  ├─ JSON-safe schema、contract、provider、pipeline / lowering
  └─ 显式 preset

@retikz/standard-react ──→ @retikz/standard + @retikz/react
@retikz/standard-vanilla ─→ @retikz/standard + @retikz/vanilla
```

`standard` 不依赖 adapter、renderer 或领域 feature package。两个 adapter 不复制 Standard 的 schema、definition、registry、layout 或 lowering；它们只负责 authoring 输入、宿主生命周期与输出接线。

## 发布与演进

三包使用独立 `standard` release group，并在实际 package 初始化后组内 lockstep。与其它 feature group 的关系使用兼容版本依赖，不引入 feature-to-feature 依赖。

当前阶段只确认组与包边界。首个能力 ADR 决定 package manifest、版本起点、首批子路径、迁移的现有 Sugar、发布配置和用户文档闭环。
