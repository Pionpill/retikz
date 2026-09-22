# @retikz/extension

- 使命：提供可选的官方 Core 绘图 Definition 与 provider 实现
- 拥有：节点形状、箭头、裁剪、Ribbon 的实现、参数 schema、类型、名称集合与 Ribbon profile 契约
- 不拥有：Core registry / compile 机制、Tier 2 composite、Layout、adapter、renderer
- 输入输出：消费公开 Core 契约，导出可显式注入的 Definition 或 provider contribution；不自动注册
- 依赖：仅使用 Core、Foundation、Math 与必要 schema 底座，不依赖 Standard 或 Layout
- 公共入口：只有 `@retikz/extension` 根入口，具名导出；不发布能力子路径或旧名别名
- 缺口流向：通用扩展机制归 Core，Tier 2 绘图组合归 Standard，排版归 Layout，宿主接线归 adapter
