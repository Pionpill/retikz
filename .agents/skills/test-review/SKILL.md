---
name: test-review
description: Use when auditing an existing retikz test suite, module test directory, or docs tests for stale, duplicate, implementation-coupled, migration-only, or temporary cases; classify which tests remain durable contract or regression coverage and produce evidence-backed cleanup recommendations before refactoring tests.
---

# Test Review：测试资产评审

审查测试本身是否仍在保护当前契约。本 skill 默认只读：输出保留、合并、转正或删除建议，不直接改测试、不提交。

## 边界

| 场景                             | 用哪个 skill                               |
| -------------------------------- | ------------------------------------------ |
| 审计已有测试是否过期、重复或临时 | test-review                                |
| 横向审实现、架构与文档一致性     | develop-review                             |
| 为疑似缺陷构造边界 case          | cross-test                                 |
| Alpha 实现完成后的对抗性验证     | [alpha](../cross-test/references/alpha.md) |
| 已接受测试清理建议并实施         | develop-refactor                           |

不要用测试数量、行数或覆盖率百分比直接决定保留与删除。唯一标准是：该 case 是否以最小必要粒度保护仍然存在的行为契约。

评审前必读 [单元测试编写与 Review 规范](../test-contract/references/unit-tests.md)，按共享准入与收敛判定表逐 case 分类，不另建 review 标准。

## 启动前

1. 声明范围：一个 workspace、子模块或测试目录；全仓先拆包，不做无边界扫描。
2. 记录 `git rev-parse HEAD` 和 `git status --short`，保留并区分并发工作区改动。
3. 读取根与就近 `AGENTS.md`；审 docs 时再读 `apps/docs/AGENTS.md` 及相关 docs skill。
4. 列出范围内测试、对应实现入口与公开契约，按共享规范核对一级 owner 分类、文件命名与拆分粒度。测试名、注释和 Git 历史只能说明当初意图，当前实现与公开契约才是判断真源。

## 评审方法

### 1. 建立行为映射

对每个测试文件或可独立删除的 `describe` 块，记录：

- 触发的生产入口与用户可见行为
- 精确断言了什么，以及删掉哪种真实回归会失败
- 同一行为的其它测试位置
- 需要时用 `git log -- <file>`、`git blame` 或关联 issue / commit 追溯它是否只是迁移或一次性验证

优先从实现入口反查测试，不要只按测试文件名归类。

### 2. 分类

| 分类           | 判定                                               | 默认动作                       |
| -------------- | -------------------------------------------------- | ------------------------------ |
| 契约测试       | 保护独立运行时语义、自定义校验或跨包行为边界       | 保留                           |
| 回归测试       | 对应已确认真实缺陷，且仍能解释风险                 | 保留                           |
| 行为集成测试   | 覆盖真实用户路径，且无法由更低层契约替代           | 保留或收敛                     |
| 重复测试       | 与其它 case 保护同一规则，额外 case 不增加失效模式 | 合并到最接近真实行为的一层     |
| 无独立功能测试 | 仅复述库级声明、常量、冗余存在性或自造 fixture     | 删除，不机械补写替代 case      |
| 历史护栏       | 仅保护已完成迁移、旧命名、旧目录或已删除实现       | 删除                           |
| 实现耦合测试   | 断言私有源码、固定文案、内部调用顺序或无意义快照   | 删除或改成行为断言             |
| 临时验证测试   | 只为当次流程、定位、对照或 canary 存在             | 验证后删除；符合共享准入才转正 |

Snapshot 不是天然无效：只有当它不能表达用户可见输出差异、没有明确失效价值，或被更小的行为断言覆盖时，才建议删除。

### 3. 给出可安全执行的动作

每条“合并”或“删除”建议必须写清：

- 当前受保护的契约或历史目的
- 过期、重复或耦合的证据
- 替代它的测试文件与具体 case；若没有替代，明确说明删除后风险由何处承担
- 需要保留的最小断言，避免清理时削弱唯一回归守卫

docs 测试额外检查：

- 删除一次性 smoke、静态源码字符串和固定展示文案断言前，确认通用 preview 契约或实际渲染/交互测试仍覆盖该行为。
- zh/en 可共享结构契约，但保留语言内容、路由或可访问性确有不同的测试。
- 同一控件家族优先一个遍历所有定义的通用契约测试，而不是每页复制相同断言。

## 临时测试生命周期

按共享规范的 [临时测试生命周期](../test-contract/references/unit-tests.md#临时测试生命周期) 核对创建位置、运行方式、转正依据与收尾去向；仅类型 case 直接按其 TypeScript 规则删除，不迁入 scratch。

## 报告

结果字段与留档按 [报告格式](references/report.md)。只报告有证据的发现，空类别注明无，不强制赞扬或凑数。

## 完成标志

- 每个删除或合并建议都关联当前实现与测试证据。
- 未把历史意图误当成现行契约。
- 临时 case 已明确为删除或转正，没有模糊保留项。
- 工作区除 ignored 报告外未被修改。
- 全量审计区分目录盘点、测试块审查与实现核对的覆盖范围；未逐项核对的文件不得标记为已确认可删，剩余测试全绿不能代替删除前后的契约映射。
