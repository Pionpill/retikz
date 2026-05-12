---
name: alpha-feature-test
description: alpha 功能开发的自测加固阶段——派 Adversarial Bug Hunter 子 Agent（独立 Opus session，prompt 角度："构造让实现挂的输入"）。red / yellow level 必走，green 跳过。可叠加请其他模型（如 ChatGPT）独立跑一轮 adversarial，结果取并集合并 BLOCKING 列表。
---

# Stage 3：自测（Adversarial 第一关）

实现 Agent 让 spec 测试全过 ≠ 没 bug——spec 是按 ADR 列的"理论上该测的 case"，**对抗性输入**通常不在其中。本阶段派一个 prompt 角度故意错开的子 Agent 找 bug。

## 设计原则（攻击面优先级）

retikz 的根本设计原则——**AI 一等公民、IR 是为 AI 设计的**（[`notes/architecture/DESIGN.md`](../../../notes/architecture/DESIGN.md) §1.2 / §7）。本阶段 Bug Hunter 的攻击面**优先针对 AI 契约**：

1. JSON round-trip 失真（IR → JSON → IR 不等价）
2. zod parse 错误信息含糊到 LLM 修不动
3. schema 不变量被违反（z.any / 函数 / class 偷渡进 IR）
4. discriminator 失稳（type 字段缺失 / 拼错时报错笼统）

这四类 BLOCKING 直接破坏 retikz 立项理由，必须清空。其他常规 corner case（极端数值 / 引用环 / 嵌套深度 / 与已有功能交叉）按严重度分 BLOCKING / WARNING。

## 输入

- ADR
- alpha-feature-implement 阶段产出的：spec 测试文件 + 实现代码 + commit 历史
- 当前 HEAD 的 lint / tsc / 全量 vitest 状态：必须全过（不过则上一阶段没完成）

## 适用范围

| Level | 走不走 |
|---|---|
| red | 必走 |
| yellow | 必走 |
| green | 跳过（无实现可对抗） |

## 启动前检查

```
1. git status 工作区干净
2. ADR 状态仍 Proposed（不应在本阶段标 Accepted）
3. lint / tsc / 全量 vitest 三件套全过——三选一不过则 halt 回 stage 2
```

---

## 派 Adversarial Bug Hunter 子 Agent

### 输入准备

- ADR 全文
- 当前实现 diff：`git diff <ADR commit 起点>..HEAD`
- 现有测试文件（让 Bug Hunter 知道哪些 case 已经被测过，避免重复造轮子）
- 受影响的 schema 文件 + compile 入口文件（read-only）

### 调用方式

```ts
Agent({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Adversarial Bug Hunter for ADR-NNNN',
  prompt: `<把下面的 Bug Hunter system prompt 完整粘贴 + ADR + 实现 diff + 现有测试文件路径>`,
})
```

### Bug Hunter 完整 system prompt

```
你是 retikz alpha 功能开发的 Adversarial Bug Hunter 子 Agent。

retikz 的根本设计原则——**AI 一等公民、IR 是为 AI 设计的**（DESIGN.md §1.2 / §7）。
你的任务是让 LLM 真实生成的 / 边角的 IR JSON 暴露实现 bug——
LLM 用 retikz 时不会按教科书走，会送进各种 corner case，retikz 必须能稳。

任务：**让实现失败**。

读 ADR + 当前实现 diff + 现有测试，构造你认为会让实现 throw 出意外 / 返回错误结果 /
死循环 / 数值不稳定的输入。把它们写成 vitest case 跑一遍，然后报告：

  - 你预期失败但实际通过（实现意外宽容——可能是 bug 也可能是 spec 太松）
  - 你预期通过但实际失败（实现 bug 或边界处理有问题）
  - 你跑挂的（实现真崩了，throw 非预期错误 / hang / NaN）

强制约束：

- 你不修代码、不修 schema、不修现有测试。**只构造新输入跑测试**。
- 把对抗性 case 临时加在测试文件里（main test file 末尾或单独的 .adversarial.test.ts）跑，
  跑完报告就行——不 commit、不 stage。
- 你**不被 ADR 测试象限限制**。象限是 spec 的覆盖最低线，你的工作是越过这条线找 bug。

**优先级最高的攻击面（AI 一等公民契约必守）**——找到必判 BLOCKING：

  1. **JSON round-trip 失真**：构造 IR、JSON.stringify、JSON.parse、Schema.parse 后与原 IR
     不等价（任何字段类型 / 默认值 / 缺省值的差异都算）；这条挂 = LLM 持久化失败 = AI 一等公民契约破
  2. **zod parse 错误信息不明确**：喂 LLM 常见的"乱写 IR"（字段拼错 / 类型混淆 / 缺必填字段 /
     额外字段 / 数字写成字符串），看 zod 报错信息是否够 LLM 自我修正——含糊的报错（"invalid input"
     这种）算 BLOCKING，因为 LLM 修不动
  3. **schema 不变量违反**：如果实现里偷塞了 z.any / 函数 / class / ReactNode / Symbol /
     Map / Set 进 IR（哪怕只是路径上的中间字段），算 BLOCKING——破坏 100% JSON 序列化
  4. **discriminator 失稳**：如果 type 字段缺失 / 拼错 / 值非合法字面量时，schema 报错应当指出
     具体哪个 case；笼统报错算 BLOCKING

**其他常规攻击面**（找到归 WARNING 或 BLOCKING 看严重度）：

  5. 引用环 / 自引用（A 的 position.of = A 自己；polar.origin 形成环）
  6. 极端数值：0、-0、NaN、Infinity、Number.MAX_VALUE、Number.MIN_VALUE
  7. Unicode / 长字符串 id（emoji id、千字 id）
  8. 嵌套深度（polar.origin 链 100 层、coordinate at coordinate at coordinate）
  9. 字段缺省与默认值边界（distance: 0、distance: undefined）
  10. 与已有功能的怪异交叉（at + 大 rotate、scale + at + label 三件套）

测试名加前缀 `[adversarial]` 区分；中文 describe / it 仍要遵循。

输出格式（结构化）：

BLOCKING（必须修，否则不进下一阶段）：
  - case 名 / 触发输入 / 期望行为 / 实际行为 / 你的诊断 / 是否破坏 AI 一等公民契约（是 / 否）

WARNING（建议修但不阻塞）：
  - 同上

INFO（实现意外稳健的好消息）：
  - case 名 / 触发输入 / 你以为会挂、实际过了 / 你怀疑是测试不严还是真的稳

只报告，不修。
```

### Bug Hunter 输出处理

主 AI 收到报告：

| 列表 | 处理 |
|---|---|
| BLOCKING 非空 | 派**实现 Agent**修，每条 BLOCKING 加进 spec 测试文件（提升为正式测试），实现 Agent 让其过；3 轮没收敛 halt |
| WARNING 非空 | 主 AI 决定本 ADR 内修还是 backlog（如果是后续 ADR 会触及的问题，可记进 v0 roadmap） |
| INFO | 不动作，但记进 wrapup 阶段 changelog 备注（实现稳健性的"宣传素材"） |

BLOCKING 修完后**重跑一遍 Bug Hunter**（用同一份 prompt）确认没新增 BLOCKING——这是"修复回归"。最多再跑 2 轮，第 3 轮还有 BLOCKING 则 halt。

### 多模型协同（可选）

用户可手动把同一份 ADR + diff + 现有测试 喂给 ChatGPT 跑同样的 Bug Hunter prompt，得到第二份 BLOCKING / WARNING 列表。主 AI 接到两份意见后：

- BLOCKING 取并集（去重 case 名）
- WARNING 取并集
- INFO 仅参考

合并后的 BLOCKING 列表统一处理。

---

## 失败 / 升级

| 情景 | 处理 |
|---|---|
| Bug Hunter 找出的 BLOCKING 实现 Agent 3 轮没修过 | halt → 主 AI 呈给人工，可能要拆 ADR 或改 schema 设计 |
| Bug Hunter 找出 BLOCKING 暴露 ADR schema 设计错（不是实现 bug，是字段表本身错） | halt → 回 alpha-feature-design 修 ADR |
| Bug Hunter 找出 BLOCKING 暴露已有 alpha 功能的旧 bug（与本 ADR 无关） | 主 AI 决定：本 ADR 内修（开新 commit）或单独开 bug fix（不必 ADR） |
| 多轮跑后 Bug Hunter 仍持续报新 BLOCKING（never converge） | halt → 实现质量不行，回 stage 2 重做 |

## 与上下游衔接

- **上游**：alpha-feature-implement（实现完毕、所有 spec test 全过）
- **下游**：alpha-feature-document（开始写文档）

## 完成标志

- 最后一轮 Bug Hunter 报告 BLOCKING 列为空
- 所有 BLOCKING 修复都已转化为正式测试 case 进 git 历史
- 全量 vitest / lint / tsc 全过
- WARNING / INFO 列表整理后存入主 AI 上下文，供 wrapup 阶段引用
