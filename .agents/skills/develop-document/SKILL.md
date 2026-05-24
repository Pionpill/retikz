---
name: develop-document
description: alpha 功能开发的文档阶段——把已实现已通过 adversarial 第一关的功能落进 apps/docs/。衔接 docs-doc-principle SKILL（按页型再分流到 docs-doc-component / docs-doc-example；双语 mdx + demo + API 表 + sidebar / i18n 同步）。绿色 level 改动若主体就是文档，本阶段即主流程；红色 / 黄色实现的文档化在本阶段补齐。
---

# Stage 4：文档

实现已稳（Bug Hunter BLOCKING 清空），接下来把功能"用户化"——文档站给用户看的章节、API 表、demo 都补上。

## 评审优先级（用户习惯，必读）

> 用户 review 一个功能时**先看站点文档演示（site demo），再看代码细节**。由此三条铁律：
>
> 1. **站点 demo 是首要交付物**——能在 docs 站跑起来、直观演示该 ADR 能力的 `<name>.demo.tsx` 比代码注释 / 测试更先被看到；demo 必须真渲染出体现该功能的画面，不能是占位。
> 2. **文档不可跳过 / 延后**——即使在自治 / 离线 / "先收口" 场景，一个功能**没补文档 demo 就不算 flow 走完**。stage 4 是硬关卡，不因赶进度或上下文预算省略；宁可少做一个功能、做完的功能必带 demo。
> 3. **完工汇报先呈 demo**——给用户的完工报告**先给文档页路径 + 怎么看**（哪个组件页 / `pnpm dev:docs` 访问哪条路由），再讲代码改了哪里。

## 输入

- ADR（已 Proposed，未 Accepted——Accepted 是 wrapup 阶段的事）
- develop-test 阶段产出的稳定实现 + 完整测试
- develop-test 留下的 INFO 列表（实现稳健性的素材，可写进文档"提示"段）

## 适用范围

| Level | 走不走 |
|---|---|
| red | 必走（功能要让用户能查到） |
| yellow | 必走 |
| green | 主体就是文档 → 直接进本阶段（跳过 implement / test 大部分） |

## 流程主体

委托给 [`docs-doc-principle`](../docs-doc-principle/SKILL.md) SKILL（按页型再分流到 [`docs-doc-component`](../docs-doc-component/SKILL.md) / [`docs-doc-example`](../docs-doc-example/SKILL.md)）。本 SKILL 主要负责：

- 列出本 ADR 必须落到文档站的清单
- 检查 doc-skill 产出是否覆盖了清单
- 校验双语并行 / API 表 / sidebar 注册的完整性

## 必落清单

按 ADR 类型分：

### 新 IR 字段 / 新 prop（红色 / 黄色 ADR 通常都是）

- [ ] 对应组件页 mdx 加章节描述
- [ ] API 表加新行（`prop` / `类型` / `默认值` / `描述` 四列）
- [ ] 至少一个 `<ComponentPreview name="..." />` 示例
- [ ] 对应的 `<name>.demo.tsx`——**含展示文本则双语**（`<name>.zh.demo.tsx` + `<name>.en.demo.tsx`），无文本则单文件
- [ ] zh + en 两份 mdx 结构对齐

### 新 kernel / sugar 组件

- [ ] 新建组件页目录 `core/components/<...>/<组件>/`
- [ ] `index.zh.mdx` + `index.en.mdx`
- [ ] ≥ 2 个独立 demo（基本用法 + 进阶用法）
- [ ] `apps/docs/src/data/<...>.ts` 加 sidebar 条目
- [ ] `apps/docs/src/i18n/locales/{zh,en}.json` 加 i18n key

### 改默认值 / 改字段语义

- [ ] mdx 里描述行更新（旧默认值改新）
- [ ] 受影响 demo 检查 / 改
- [ ] 章节末加"行为变化"提示（让从旧 alpha 升上来的用户知道）

### 删 prop / 删字段

- [ ] mdx API 表删行
- [ ] 受影响 demo 删 / 改
- [ ] 章节里如有相关说明全删

## doc-skill 衔接

调用 docs-doc-principle SKILL（按页型再读 docs-doc-component / docs-doc-example）时把上面"必落清单"作为输入，让其按清单逐条产出 mdx / demo 文件。

主 AI 接到 doc-skill 产出后回校：

```
- 必落清单每条是否打勾？没打勾的项 halt → 派 doc-skill 补
- 双语 demo 文件结构是否一致（同 props / 同 layout / 仅文案差异）？
- API 表行是否完整（4 列填全）？
- sidebar / i18n 是否两端都注册？
```

## demo 文件命名（与 doc-skill 一致）

- 无文字：`<name>.demo.tsx`
- 含展示文本：`<name>.zh.demo.tsx` + `<name>.en.demo.tsx`（[`ComponentPreview`](../../../apps/docs/src/components/shared/component-preview/ComponentPreview.tsx) 按当前 i18n 语言挑）

## commit 颗粒度

按章节粒度 commit，不要把"3 个新 demo + 2 个 API 表行 + sidebar"全揉一坨：

```
:books: alpha.X 文档：<组件>/<新章节> + zh/en 双语 demo
```

如果改动跨多个组件页，**每个组件页一个 commit**。这样 review 时一目了然。

## 失败 / 升级

| 情景 | 处理 |
|---|---|
| doc-skill 写出的 mdx 描述与实际行为不符 | halt → 主 AI 呈报，让 doc-skill 重写（不要让本 SKILL 自己改 mdx，违反职责分工） |
| 必落清单某项 doc-skill 不知道怎么写（如新 demo 找不到合适场景） | halt → 主 AI 提供 demo 场景或改 ADR 加示例 |
| 双语 demo 文案不对应（zh 用了中文示例文本但 en 拷贝过来没翻译） | halt → 让 doc-skill 修 |

## 与上下游衔接

- **上游**：develop-test（实现已稳）
- **下游**：develop-wrapup（写 changelog + 跑 Adversarial 第二关 + 人工 ack）

## 完成标志

- 必落清单全部打勾
- zh + en mdx 两份都更新且结构对齐
- demo 文件能跑（`apps/docs` dev server 起来访问对应页面 SVG 渲染正常）
- sidebar / i18n key 都注册
- 文档相关的 commit 全部入 git，message 用 `:books:`
- **向用户汇报完工时先呈站点 demo**：给出文档页路径 + 访问路由（`pnpm dev:docs` 看哪条），再讲代码细节（见 §评审优先级）
