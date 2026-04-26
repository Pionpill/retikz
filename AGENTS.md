# AGENTS.md

面向 AI 编码助手（Claude Code / Copilot / Cursor 等）的项目工作指南。人类贡献者同样适用。

## 项目概览

**retikz** 是一个基于 React 与 D3 的绘图库，灵感来自 LaTeX 的 TikZ，用于以组件化的方式声明节点、路径、箭头等图元。

- 语言：TypeScript（ESM）
- 运行时：React ≥ 18
- 构建：Vite + `vite-plugin-dts`
- 文档站：<https://pionpill.github.io/retikz.doc/>

## 仓库结构

这是一个 pnpm monorepo，workspace 定义在 `pnpm-workspace.yaml`：

```
retikz/
├── packages/
│   ├── legacy-core/    # @retikz/legacy-core — v0.0.x 旧实现，保留作参考，不发布
│   └── core/           # @retikz/core — v0.1 重写中，见 docs/CORE-REFACTOR.md
├── apps/
│   └── docs/           # @retikz/docs — 文档站点，mdx 内容在 apps/docs/doc/{en,zh}/
├── config/
│   └── eslint/         # 共享的 ESLint 预设
├── docs/               # 项目内部架构与重构方案文档
├── pnpm-workspace.yaml # workspace + catalog（统一依赖版本）
├── eslint.config.js    # 根级 flat config
└── tsconfig.json
```

v0.1 重写正在 `next` 分支上进行。架构与实施方案见 `docs/`：
- `docs/DESIGN.md`：架构与底层建设
- `docs/CORE-REFACTOR.md`：@retikz/core 重写方案
- `docs/REACT-ADAPTER.md`：@retikz/react 适配层方案

## 依赖管理

**所有共享依赖的版本都写在 `pnpm-workspace.yaml` 的 `catalog:` 段。** 子包 `package.json` 中只使用 `"some-pkg": "catalog:"` 引用，不要硬编码版本号。

- 新增依赖：先在 `pnpm-workspace.yaml` 的 `catalog:` 中登记版本，再在需要它的 `package.json` 里写 `"catalog:"`
- 升级版本：只改 `catalog:` 中的版本号，所有子包自动生效
- 某个包仅被单个子包使用，也建议登记到 catalog，便于后续复用
- React / React-DOM 对库来说是 `peerDependencies`（保留宽松区间如 `>=18`），同时放进 `devDependencies` 用 `catalog:` 供本地开发

## 常用命令

根目录：

```bash
pnpm install                         # 安装所有 workspace 依赖
pnpm lint                            # ESLint 全量（带 --cache）
```

子包（示例：legacy-core）：

```bash
pnpm --filter @retikz/legacy-core dev       # 启动开发
pnpm --filter @retikz/legacy-core build     # 构建产物到 dist/
pnpm --filter @retikz/legacy-core lint      # 单包 lint
pnpm --filter @retikz/legacy-core preview   # 预览构建结果
```

v0.1 新 core 正在 `next` 分支重写中，写完后命令切换为 `pnpm --filter @retikz/core ...`。

## Commit 规范

> **🚨 重要规则：未经用户明确允许，AI 助手（Claude Code / Copilot / Cursor 等）不得自行执行 `git commit` / `git push` / `git rebase` 等会写入 git 历史的操作。**
>
> 写完代码、改完文件后**停下来等用户审阅**，由用户下达"提交"指令后再做提交。
> 用户可以让 AI 起草 commit message，但实际提交动作必须由用户授权。

**格式：`<emoji> <简短描述>`**

使用 [gitmoji](https://gitmoji.dev/) 风格的 `:slug:` 形式或对应 Unicode 表情均可，描述使用中文，一般不超过 50 字。示例：

```
:sparkles: 添加 PathNode 组件
:bug: 修复路径分段错误
:recycle: context 细粒度拆分
🚚 改为多 packages 项目管理形式，迁移代码到 core 下
```

### 本项目已使用的 emoji

下表是从 git 历史中总结出的用法，**新 commit 请沿用同一套语义**，不要引入其它 emoji（除非确有新场景且需先在此处补充说明）：

| Slug | 符号 | 用途 |
| --- | --- | --- |
| `:construction:` | 🚧 | 开发中 / 进行中的增量修改（最常用） |
| `:sparkles:` | ✨ | 新增独立功能或组件 |
| `:bug:` | 🐛 | 修复 bug |
| `:recycle:` | ♻️ | 重构（不改变外部行为） |
| `:truck:` | 🚚 | 移动或重命名文件 / 变量 |
| `:pencil:` | 📝 | 文档、注释、说明类改动 |
| `:wrench:` | 🔧 | 工程/配置文件调整（eslint、tsconfig、CI 等） |
| `:package:` | 📦 | 打包配置、产物发布相关 |
| `:heavy_plus_sign:` | ➕ | 新增依赖 |
| `:fire:` | 🔥 | 删除代码或文件 |
| `:bookmark:` | 🔖 | 发布版本（打 tag） |

### 选择建议

- 改了 `.md` / `apps/docs/doc/` → `:pencil:`
- 改了 `pnpm-workspace.yaml` / `eslint.config.js` / `tsconfig.json` 等 → `:wrench:`（配置）或 `:recycle:`（结构性整理）
- 新增一个 API / 组件 → `:sparkles:`；其细节打磨后续改动 → `:construction:`
- 纯删除无用代码 → `:fire:`
- 版本号变更并准备发布 → `:bookmark:`

## 代码风格

- ESLint 统一在根目录通过 `pnpm lint` 运行，flat config 见 `eslint.config.js`
- 不要在子包里重复声明工具链（eslint、typescript 等）的版本，统一用 catalog
- 变量/文件命名沿用现有风格：组件 PascalCase，hooks `useXxx`，工具类小驼峰
- 尽量不写注释；确需解释"为什么"时再写，避免复述代码做了什么
- 数组类型用 `Array<T>`，不用 `T[]`（项目内统一）
- **函数定义优先用箭头形式**：`const fn = (...) => {...}` 而不是 `function fn(...) {...}`
  - 顶层导出：`export const fn = (...) => {...}`
  - 内部 helper：同上
  - 例外：需要 hoisting（在定义点之前被引用）；类方法仍按 class 语法

## IR / Schema 风格（zod）

> 见 `docs/DESIGN.md` §7 "AI 友好性"——schema description 是给 LLM 看的契约，必须完整。

- **每个 zod schema 字段都必须 `.describe(...)`**——包括 object 顶层和内部所有属性，包括看似自描述的字段（type / kind 等）
  - description 写**含义与用途**，不是复述字段名
  - description 是 LLM 输出 JSON 时的关键参考，影响生成质量
  - JSON Schema 导出后这些 description 直接进 LLM tool definition / system prompt
- **`.describe(...)` 的内容统一用英文**
  - 对应外部 / 国际 OSS 用户、LLM tool definition、JSON Schema 生态工具——英文兼容性最好
  - LLM 现在跨语言映射很稳，中文 prompt 配英文 schema description 没有质量损失
  - 不允许中英混写（`'背景色 Background color'` 这种）
- **TS 类型用 `z.infer` 派生，不手写**
  - 派生类型形如 `export type IRNode = z.infer<typeof NodeSchema>`
  - 单一来源是 zod，避免类型与 schema 漂移
- **zod schema 定义内部不写 JSDoc**——schema 自身的字段说明全部走 `.describe(...)`，不在 zod 链里加 `/** */` 注释；这避免了"中文 JSDoc + 英文 describe"双份维护的冗余
- **zod 派生类型 / 普通常量 / 函数 / 类必须写中文 JSDoc**
  - 派生类型：`/** 节点 */ export type IRNode = z.infer<typeof NodeSchema>`
  - 普通常量：`/** IR 当前主版本号 */ export const CURRENT_IR_VERSION = 1 as const`
  - 导出函数：函数签名上方一段 JSDoc，说明意图、输入输出、可能的副作用
  - 类：类声明上方一段 JSDoc，主要方法也要带 JSDoc
  - **对象字面量当命名空间用时，每个成员都要 JSDoc**——例如 `export const point = { add, sub, ... }`，每个方法上方都要写 `/** ... */`，不能只在外层对象上写一行
  - **`type` / `interface` 声明的每个属性都要 JSDoc**——例如 `type Rect = { x, y, width, height }`，每个字段都要写 `/** ... */`，不能只在外层 type 上写一行
  - **type / interface / 对象字面量的成员间一律不加空行**（即使每个成员都带 JSDoc）——保持声明紧凑
  - **`export const XxxSchema = z...` 不写 JSDoc**——它的语义已经在 `.describe(...)` 里说尽
- JSDoc 内容用中文（项目母语），保持简洁；只解释"是什么 / 为什么"，不复述代码做了什么
- IR 元素一文件一种：`packages/core/src/ir/<element>.ts` 同时写 schema 和 `z.infer` 派生类型
- IR 字段命名沿用 TikZ 词汇（`stroke`、`fill`、`strokeWidth`、`via`、`anchor` 等），保留对 LLM 训练数据的亲和力
- 不允许在 IR schema 里出现 `z.any()` / `z.unknown()` / 函数 / `ReactNode`——IR 必须 100% JSON 可序列化（见 DESIGN.md §4.3）
