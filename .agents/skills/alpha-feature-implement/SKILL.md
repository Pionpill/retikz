---
name: alpha-feature-implement
description: alpha 功能开发的实现阶段——红色改动（动 IR / public API / compile 核心）走 Spec-First TDD：先派 Spec Writer 子 Agent 写 schema stub + 测试（独立 Opus session），再让实现 Agent 让所有测试通过；黄色改动可选 Spec-First；绿色直接实现。实现 Agent 不允许改测试文件 / 不允许改 schema 字段名（schema 改动以 ADR 实现契约段为准）。
---

# Stage 2：实现

按 ADR 实现契约段把功能写进代码。**红色** 改动走 Spec-First TDD；黄色 / 绿色按规模选择。

## 输入

- ADR 路径：`notes/adr/<NNNN>-*.md`，状态 Proposed
- ADR 实现契约段已填全（Level / Schema 改动 / 文件 scope / 测试象限）

## 启动前自动判级

读 ADR 实现契约段的"文件 scope"，按 [`alpha-feature-dev`](../alpha-feature-dev/SKILL.md) 的判级表算 Level：

```
红 → 走 Spec-First（强制）
黄 → 按 ADR 规模决定（多于 3 step 建议走 Spec-First；少则常规）
绿 → 直接实现，跳过 Spec Agent
```

跨级（同时碰红 + 黄 + 绿）取最高 level 走流程，绿色文档部分走 stage 4 单独跑。

---

## 红色 / 黄色（Spec-First）

### 2.A 派 Spec Writer 子 Agent

#### 2.A.1 输入准备

- ADR 文件全文
- `notes/architecture/DESIGN.md`
- 受影响的现有 schema 文件（read-only，从 ADR "依赖的现有元素" 列出）
- ≤ 3 个**与本 ADR 主题无关**的现有测试文件（学项目 vitest 风格 / 命名 / 断言习惯，不学 case 选择）

#### 2.A.2 调用方式

```ts
Agent({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Spec Writer for ADR-NNNN',
  prompt: `<把下面的 Spec Writer system prompt 完整粘贴 + ADR 内容 + 风格示例文件路径>`,
})
```

#### 2.A.3 Spec Writer 完整 system prompt

```
你是 retikz alpha 功能开发的 Spec Writer 子 Agent。

任务：读 ADR 的实现契约段，输出两份文件：
  1. zod schema stub（按"Schema 改动"表精确加字段，字段名 / 类型 / 默认值 / .describe 一字不差，但不写
     compile 实现、不动 react kernel）
  2. vitest 测试文件（按"测试象限"展开成具体 case，覆盖 ≥ 9 个 case：
     happy ≥ 3、边界 ≥ 2、错误路径 ≥ 2、交互 ≥ 2）

强制约束：

- 字段名 / 类型 / 默认值必须与 ADR 表一字不差。如果 ADR 表本身有矛盾（字段名和 .describe 不一致 /
  类型与默认值不兼容），halt 并报告，不要自行修订。
- 测试 import 真实 schema（你刚写的 stub），expect 走真值断言，不要 mock。
- 测试名用中文 describe + 中文 it（项目惯例）；断言用 expect().toBe / toEqual / toThrow 等 vitest 标准。
- 你可以读最多 3 个**与本 ADR 主题无关**的现有测试文件来学习风格。**不要**读与本 ADR 主题相关的测试
  （如本 ADR 改 Node.label，则不读 node-text / node-styled / node-rotated 等 Node 相关测试）。
- 不要看现有 compile / react 实现代码——你只看 schema 和 ADR。
- 不写 compile 实现、不写 React 组件、不动 _builder / _unbuilder。
- 测试此刻应当大部分 fail（实现还没写）——这是预期行为，不要为了让测试过就降低断言强度。

输出格式：

Step 1. 读这些文件：<列出 ADR 路径 + DESIGN.md + 受影响 schema + 3 个无关测试>
Step 2. 创建 / 修改 schema 文件：<列出 path + 完整文件内容>
Step 3. 创建测试文件：<path + 完整文件内容>
Step 4. 报告"已写完"+ 测试 case 数 + 哪些 case 此刻预计 fail / pass

不要 commit。把改动留在工作区，主 AI 会负责 commit。
```

#### 2.A.4 Spec Writer commit

主 AI 收到 Spec Writer 输出后：

```bash
git add <schema 文件> <测试文件>
git commit -m ":construction: ADR-NNNN spec：schema stub + 测试 case 骨架（实现待补）

测试当前 fail 是预期——下一步实现 Agent 让其全过。
"
```

emoji `:construction:` 标"进行中"，让 commit hook 接受 test fail 状态。这是 Spec-First 流程的特例——其它 commit 仍必须 lint / tsc / test 全过。

#### 2.A.5 多模型协同（可选）

用户可手动把同一份 ADR + DESIGN.md 也喂给另一个 LLM（如 ChatGPT）跑同样的 Spec Writer prompt，得到第二份 spec。主 AI 收到两份 spec 后：

- schema stub 取 union（合并所有字段——前提是没冲突；冲突 halt 报告人工）
- 测试 case 取 union（去重 case 名 + 去重断言意图）

合并完整体仍按 2.A.4 commit。

---

### 2.B 派实现 Agent

#### 2.B.1 输入

- ADR
- 上一步 Spec Writer 写的 schema 文件 + 测试文件
- 现有 compile / react 代码（read + write）

#### 2.B.2 实现 Agent 调用方式

```ts
Agent({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Implementation Runner for ADR-NNNN',
  prompt: `<把下面的实现 Agent system prompt 完整粘贴 + ADR + spec 文件路径>`,
})
```

#### 2.B.3 实现 Agent 完整 system prompt

```
你是 retikz alpha 功能开发的实现 Agent。

任务：让 Spec Writer 写好的所有测试通过。读 ADR + spec test，按 ADR Step 拆分写实现，
每个 step 一个 commit；每次 commit 前跑 lint + tsc + 全量 vitest，全过才进下一步。

强制约束：

- **不允许动 spec test 文件**。如果你认为某条测试错了（拼错 / 与 ADR 矛盾 / 期望不合理），
  halt 并报告"我认为这条测试错了：<原因>"——主 AI 决定退回 Spec Writer 重写还是裁决人工。
  不要 silent 改测试。
- **不允许动 schema 字段名 / 类型**。schema 已由 ADR + Spec Writer 锁死。如发现 schema 表
  本身有问题，halt 报告，不要自行修订。
- 不允许 `as any` / `@ts-ignore` / `@ts-expect-error`（除非确有不可避情况且同行写明原因）。
- 不允许 `it.skip` / `xit(` / `describe.skip`。
- 不允许 lint disable（除非确有不可避情况且同行写明原因）。
- 一个 ADR Step 一个 commit。commit message 用 `:sparkles: ADR-NNNN step.X：<简述>` 风格。
- 每次 commit 前必须跑：
    pnpm --filter @retikz/<pkg> exec eslint .
    pnpm --filter @retikz/<pkg> exec tsc --noEmit
    pnpm --filter @retikz/<pkg> exec vitest run
  任一不过 → halt，不 commit、不进下一步。
- 不要自行 git push / publish。

如果实现 X 步连续 3 次跑测试还是不过：halt，呈报"step X 修不动"+ 错误日志 +
你的诊断（哪个 case 挂、为什么觉得修不动）。

不要主动加测试 case——测试是 Spec Writer 的产物，你的工作只是让现有测试过。
你可以加内部 helper 函数，但 helper 不能改变 public schema 字段。
```

#### 2.B.4 实现 Agent commit

实现 Agent 自己跑 commit（受 AGENTS.md "AI 不得自行 commit" 约束应当**先 stage 不 commit**，由主 AI 把控）。

折中做法：实现 Agent 在 prompt 内说 "git stage 改动 + 报告改了什么"，主 AI 收到报告再 commit。这样保持 AGENTS.md 红线。

每个 step 一个 commit，emoji `:sparkles:` 表示新功能 / `:bug:` 表示修复 spec 测试露的 bug。

---

## 黄色（轻量 Spec-First 或常规）

ADR Step 数 ≤ 3 + 不动 IR schema：可跳 Spec Writer 直接派实现 Agent，**但仍要写测试**——实现 Agent 边写实现边写测试（每 step 一个 commit，commit 内含实现 + 测试，跑全套验证）。

ADR Step 数 ≥ 4：建议仍走 Spec-First，享受"测试先于实现 + 第二只眼睛"的好处。

## 绿色

直接实现，无 sub-Agent。主 AI 自己改 mdx / 配置 / 注释，每个 commit 跑 lint + tsc 即可（绿色不一定有测试）。

实际流程：直接进 alpha-feature-document SKILL（绿色 ADR 主体就是文档）。

## 失败 / 升级

| 情景 | 处理 |
|---|---|
| Spec Writer 写不出测试（ADR 实现契约段不全） | halt → 回 alpha-feature-design 补充 ADR |
| Spec Writer 报告 "ADR 表自相矛盾" | halt → 主 AI 呈给人工裁决，不要让 Spec Writer 自行修订 |
| 实现 Agent 报告 "spec test 错了" | halt → 主 AI 派 Spec Writer 重写该条测试，或裁决人工 |
| 实现 Agent 单 step 3 次没过 | halt → 主 AI 呈给人工，看是否要拆 ADR 或改设计 |
| 跑出 lint / tsc / 测试错误 | 不 commit，让实现 Agent 在工作区里继续修 |

## 与上下游衔接

- **上游**：alpha-feature-design 输出已 commit 的 ADR
- **下游**：alpha-feature-test（自测加固阶段）

## 完成标志

- ADR 实现契约段列出的 schema 字段全部进 IR 文件
- spec 测试 + 实现都进入 git 历史，**测试 commit 在实现 commit 之前**（git log 可见 `:construction:` 早于 `:sparkles:`）
- lint / tsc / vitest 全过
- 实现 Agent 没动 spec 测试文件（git log 可校验）
