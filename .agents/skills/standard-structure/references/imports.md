# 模块导入导出

## 导入导出

- 内部 owner 的 `index.ts` 默认使用 `export *`（type-only 聚合使用 `export type *`），递归聚合该 owner 的稳定 API。只有明确承担公共 facade 的入口，才可使用 `export { ... }`、`export type { ... }` 或 `export * as Namespace` 来裁剪公共面、处理冲突或建立稳定的公共名称；该入口必须有 `package.json` 的显式 `exports` 映射（字符串形式视为根 `.` 映射；对象形式只认可显式键，通配符仅表达路径映射，不能单独证明每个匹配文件都是稳定 API）、包内规范或 public-surface 测试作为依据，单个源码文件存在不构成公共入口。
- 包根 `index.ts` 是否是公共 facade 由 package `exports`、包内规范或 public-surface 测试决定：作为公共 facade 时允许有证据的显式导出；作为 owner 聚合时继续使用 `export *`。无论采用哪种形式，都不得把内部实现、测试符号或仅为复用准备的符号转发到包外。
- 不需要公开的模块不得进入向上 barrel；owner 内通过相邻路径或私有子 barrel 导入，不得为测试或复用便利转发到包根。
- 包内跨 owner 的消费方从拥有者 barrel 导入；包外消费方使用 package root 或 `exports` 声明的 facade / 稳定子路径。不要从非拥有者模块转手 export 其它层内容。
- 包外导入只能使用 package root 或 `package.json` `exports` 声明的稳定子路径，不得访问未声明的源码文件。包内跨 owner 导入必须经目标 owner 或稳定二级 owner 的 barrel；稳定二级 owner 必须具有独立职责、自己的 `index.ts`，并有包内规范或已验证的跨 owner / 公共使用依据，不能仅因目录存在而成立。同 owner 内部可从相邻模块导入，不要为了追求包根入口而制造自引用或循环依赖。无论哪种情况都不得跨 owner 进入实现文件；若缺少稳定 barrel，应先补充边界或重新判断所有权。
- 同一文件中同 kind（type 或 value）且同 source 的 named import 必须合并为一条；type/value 因 lint 规则保持分离。
- 内部尽量避免 import / export `as` 重命名；公共 facade 仅在稳定公共名称或冲突隔离确有需要时建立别名，不建立兼容旧 API 的迁移别名、fallback 或双轨实现。
- 主题内部可相邻导入；模块外避免 deep import 到 `constants.ts` / `schema.ts` 等私有文件。
