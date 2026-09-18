# 发布范围与版本

读取 scripts/release-groups.config.mjs；包 manifest 的 retikz.domain / releaseGroup / layer / publishable 必须一致，运行 pnpm run check:release-groups 核验。配置或 manifest 不一致时先报告并对齐，不猜测发布组。private apps 不发布。

同组所有 publishable 包 lockstep 同版本、同次发布，按配置依赖顺序执行；不同组版本独立，目录不等于发布单元。

## Git tag 规范

- Kernel 统一使用 `kernel-v<version>`，九个 Kernel 包共享一个 tag。
- 其他发布单元使用主包名作为 tag 前缀：去掉 `@retikz/` scope 后写成 `<main-package>-v<version>`，例如 Plot 使用 `plot-v<version>`、Standard 使用 `standard-v<version>`。不得再叠加 domain 或其他分组前缀。
- 主包及其 React / Vanilla 适配包共享一个 tag；不得为 `plot-react`、`plot-vanilla` 等适配包分别打 tag。
- tag 必须对应 `scripts/release-groups.config.mjs` 中完整的发布单元；只有 `pnpm run check:release-groups` 通过后才能创建。
- 历史 Kernel 裸 `v<version>` tag 保持原样，不得迁移或补打同版本前缀 tag；新版本从本规范生效后改用 `kernel-v<version>`。
- 必须创建 annotated tag：`git tag -a <tag-prefix>-v<version> -m "<tag-prefix> <version>"`，不得创建 lightweight tag。
- tag 只指向已提交且工作树干净的发布提交；创建前确认组内版本、npm registry 连续性，以及本地和远端均不存在同名 tag。
- 已发布 tag 不得移动、复用、删除或强制覆盖；tag 名冲突时停止并让用户决定新版本。
- 汇报 tag 状态时必须分别说明本地是否存在、远端是否存在和各自指向；“本地已创建”不等于“已 push”。
- 创建 tag 与 push tag 分别获取授权；默认在 npm publish 全部成功后才 push commit 和 tag。

依赖范围表达版本耦合：

- 同发布组内部依赖用 `workspace:*`，发布时应解析为同组目标版本。
- 跨发布组内部依赖用 `workspace:^`，发布时应解析为兼容范围；只有依赖组发生不兼容变化且当前组需要适配时，才同时发布消费组。
- 跨发布组依赖须符合就近 AGENTS 的能力所有权和单向依赖边界；例如 Diagram 可消费 Graph，Chart 可消费 Plot，不因独立 release group 而禁止既定分层依赖。

## 上游发布闭包与确认表

开始发布准备时，先从用户指定的发布组解析所有生产 `@retikz/*` 依赖，递归检查跨发布组的 `workspace:^` 范围及官方 npm registry。若当前发布需要尚未发布的上游 API 或目标范围无法在 registry 解析到兼容版本，必须把该上游发布组及其全部 lockstep 包纳入本次发布闭包；不能只补发组内一个包。按依赖顺序先发布上游组，再发布用户指定组。

对闭包内每组，从上次已发布快照以来的实际改动、changelog 草稿与必需上游能力识别本次相关 ADR，逐篇阅读全文并对照实现、公开契约、测试和 docs。Accepted 只表示设计获批，不是完成证据；bugfix / 优化无需为发包补造 ADR。真正需要的能力尚未实现、相关契约不一致、半成品污染发布快照或验证失败才阻塞受影响发布链；省略变更说明不能排除已合入的半成品代码。

Roadmap 只管理中版本能力目标，不按 alpha / beta / rc 序号安排 ADR。与本次交付无关且不影响快照的未完成项列为“未纳入”，留在原中版本，不阻塞发布、不随 alpha 递增搬迁。只有人工决定改变中版本范围时才延期目标；Beta / RC / Stable 升段仍须核验对应能力、冻结与质量门槛。

在改版本、changelog、roadmap 或运行发布验证前，向用户展示发布闭包表并等待确认。每个发布组只占一行，不展开组内主包与 React / Vanilla 适配包。表至少包含：

| 发布顺序 | 发布组 | 已发布 -> 目标版本 | 纳入原因 | 本次用户可见更新 | 未纳入计划项 | 真实阻塞项 |
| -------- | ------ | ------------------ | -------- | ---------------- | ------------ | ---------- |

- “本次用户可见更新”从该组 changelog、公开 API / schema / adapter 改动和必要 docs 中汇总；没有用户可见更新时明确写“无”，并据此重新判断该组是否需要发布
- “未纳入计划项”说明未完成但与本次交付无关的能力；“真实阻塞项”说明缺失能力、验证证据和受影响下游组，不以 ADR 状态代替判断
- 表外另列出 registry 中已满足的上游组，以及不纳入本次发布的理由
- 用户确认的对象是完整发布闭包、每组版本、更新摘要、未纳入项与真实阻塞结论；未确认前不得假定只发布最初指定包或继续写发布准备文件

## 版本连续性

定版本前查锚点包：

```bash
npm view @retikz/core versions --registry=https://registry.npmjs.org/
npm view @retikz/core dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/data versions --registry=https://registry.npmjs.org/
npm view @retikz/data dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/plot versions --registry=https://registry.npmjs.org/
npm view @retikz/plot dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/table versions --registry=https://registry.npmjs.org/
npm view @retikz/table dist-tags --registry=https://registry.npmjs.org/
npm view @retikz/standard versions --registry=https://registry.npmjs.org/
npm view @retikz/standard dist-tags --registry=https://registry.npmjs.org/
```

规则：

- 同一 prerelease channel 只能 `alpha.N -> alpha.(N+1)` 这样递增 1。
- 升段从 `.1` 开始：`alpha.N -> beta.1`、`beta.N -> rc.1`、`rc.N -> stable`。
- 重发、回退、跳号必须停下让用户确认。
- alpha 用 `--tag alpha`；beta 用 `--tag beta`；rc 用 `--tag next`；stable 不带 prerelease dist-tag。
