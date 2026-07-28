# ADR-05：Scene Patch 与 Retained Renderer

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-29
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-04](./04-incremental-core-compile.md) · [ADR-03](./03-program-transaction-lifecycle.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md)

## 背景

ADR-04 已让 Core 对完整 IR Snapshot 产出稳定的 Scene Patch，但旧 SVG、Canvas 与 React 更新入口仍以完整重建为主。缺少 retained identity topology、可回滚的 renderer commit 和唯一宿主所有权时，Core 的局部收益无法穿透到 DOM、bitmap、hit-test、resource、hydration 与 animation state。

持久 Scene 的局部 `id?` 也不足以表达 anonymous subtree、重复 public id、一个 semantic owner 对多个 primitive，以及 Group descendant 的稳定 occurrence。因此增量 renderer 不能从裸 Scene 猜 identity，必须消费 Core 同次编译产生的完整 runtime snapshot 与 patch。

## 决策

### 完整 Snapshot 是真源，Patch 只是可丢弃的增量描述

Core 在 full 与 incremental final assembly 中都产出 deeply immutable 的 `SceneRuntimeSnapshot`：

- `scene` 规范化为必有 readonly `resources` / `animations` 数组
- `root` 是固定 document root identity，不对应 Scene primitive
- `topology` 与 `scene.primitives` 的递归 occurrence 严格双射
- 每个 node 记录 `identity`、`semanticOwner`、`parent`、连续 `order`、全局 `primitivePath` 与可选 `publicId`
- public snapshot、primitive、layout、resource、animation、topology 与 Patch payload 均由 session 捕获并递归冻结

`SceneRuntimeSubtree` 使用相对 topology：subtree root 的 `primitivePath=[]`、`parent` 缺省、`order=0`；descendant 只能引用 subtree 内 parent。Insert 的外部 parent/before 决定接入点，update 保留外部 parent/order，但可以替换整个 primitive type 与 descendants。

`ScenePatch` 包含连续 `baseRevision` / `nextRevision` 和以下 runtime-only operation：

- `insert`、`update`、`remove`、`move`
- `setLayout`、`setResources`、`setAnimations`
- 独占的 `replaceScene`

Operation 规范化顺序固定为 resource → parent-before-child structural → layout → animation → child-before-parent remove。Structural target 不得重复或与 ancestor/descendant 重叠；`before` 必须是 next topology 中同 parent sibling；move 不能进入自身 descendant；replace 必须独占。无法证明局部 cover 时，Core 扩大到最近稳定 subtree 或直接 replace。

Render participant 在调用 renderer 前用纯 validator 将 Patch 重放为 expected Scene/topology，并与 next Snapshot 交叉验证。Topology、Patch、revision 或 coherence 任一无效都具名 fail-loud，不能降级为 replace；空 Patch 只允许在 Scene/topology 语义不变时连续推进 revision。预编译裸 Scene 没有 topology，只保留既有 static full render，不进入 retained session。

### Runtime commit participant 与逻辑状态同一 transaction 发布

Runtime 新增 nominal `RuntimeCommitParticipant<TRead>`、非泛型 `RuntimeCommitParticipantToken`、`defineRuntimeCommitParticipant()` 与 `session.participant()`。Participant 显式声明 owner/program dependencies、`affected | continuous` revision policy、trace phases，以及私有 `prepare/read/dispose` executor；公开 token 只保留冻结 metadata，不能绕过 session gate直接读取 executor。

Session 创建前对完整 participant 数组完成无 callback preflight：nominal token、key、依赖、重复项与 ownership 必须全部合法。Token 一次性从 unowned 转为 owned，失败 create 或成功 dispose 后永久 consumed，不能跨 session 复用。Candidate view 只允许读取已声明 owner/program 的 public read。

Initial 与 update 的共同顺序为：

1. owner/program candidate 完成
2. selected participant 依次 prepare
3. prepared token 正序 commit
4. selected participant executor read 按 key exactly-once 写入 candidate read cache
5. Runtime pointer、revision 与 read cache 原子 publish
6. observer/retire 与 prepared-token dispose 收尾

Participant read 与 owner/program public read遵守同一 deeply immutable contract；未 selected participant 沿用旧 read reference。Publish 前 prepare/commit/read 失败时反向 rollback、dispose 并丢弃 candidate cache，旧 revision、logical state 与 committed read保持不变。Update rollback 全部成功后 session 回到 idle并保留原 primary error；首个 rollback 失败时以 `RUNTIME_PARTICIPANT_ROLLBACK_FAILED`作为 primary，冻结 cause `{ trigger, rollback }`，session 进入 broken，只允许 diagnostics/revision/dispose。Initial rollback 失败作为 secondary diagnostic，不返回不可达的 broken session。

Participant context只暴露 owner-bound trace write surface与 `diagnose()`；Runtime在每次 callback返回或抛出后 exactly-once drain内部 reporter。Initial失败 diagnostics随外层 `RuntimeError`返回，update失败 diagnostics同时进入现存 session queue。Prepared token与 participant dispose 均 exactly-once；callback reentry沿用ADR-03的逐API拒绝规则。

### Render retained runtime 是内置与第三方 renderer 的共同边界

`@retikz/render/runtime` 提供：

- `RenderRuntimeOwnerDefinition` 与 immutable `RenderRuntimeConfig`
- nominal `defineRetainedRenderer()`、`RetainedRendererFactory` 与 `createRetainedRenderParticipant()`
- `none | group | entity` capability
- 内置 SVG / Canvas retained renderer

Factory input是 backend/host/immutable options 的判别联合；构造前验证 backend与宿主类型，构造后验证 nominal renderer、backend与host identity。第三方 callback已抛 `RetainedRenderError`时保留原错误，其它 prepare throw包装为 `RETAINED_RENDERER_PREPARE_FAILED`；commit/rollback/dispose错误由Runtime participant envelope承接。

Capability判断严格晚于全部 validation：

- `none`只接受 initial、独占 replace 与 config-only empty Patch
- `group`额外接受全局 config operation与稳定 Group subtree structural operation
- `entity`接受全部规范化 operation

合法但 capability不支持的 Patch在调用renderer前转换为独占 replace，并产生一条 `RETAINED_RENDERER_CAPABILITY_FALLBACK` warning与 fallback trace；无效输入永不 fallback，也不调用 renderer。

Retained participant使用 `continuous` policy，维护私有 committed lineage snapshot。Config-only或无关 owner commit复制完整 Scene/topology、推进 revision并提交 empty Patch，不现场调用 renderer read。Renderer executor read只在全部commit后、Runtime publish前调用一次，并与 lineage snapshot交叉验证；公开 handle只通过 `session.participant()`读取 committed cache。

SVG 以 mutation journal/detached staging 原位更新 DOM，保留未变节点 identity；SSR adopt mismatch在 publish 前 full replace。Canvas 维护 candidate display list/index与 stable canvas，增量更新只捕获、绘制和提交 conservative dirty region；stroke、shadow、clip、transform、animation或重叠无法证明时扩大到 full path。Rollback成功时恢复旧宿主；rollback自身失败则按Runtime规则进入 broken或终止initial create。

### React 与 Vanilla 共享同一 retained session

React只拥有 `<svg>` / `<canvas>` host shell attributes/ref，Render独占 SVG descendants或Canvas bitmap/index。Render phase只生成 SSR-safe seed；layout effect创建、更新与释放 session。Compile options按JSON结构与Definition/callback identity规范化，语义变化时完整 teardown/recreate，不能热塞进旧 Core Program。

`LayoutProps.runtime`暴露可选 `rendererFactory`与 `onDiagnostic`。`handlers`、animation config与IR在同一 revision提交；`animationRef`和`onArtifacts`只在成功commit后发布，callback throw仅进入dev warning，不回滚已提交状态。失败transaction先有序drain diagnostics再原样抛 primary error，不能重复从 error与session两路投递。

SSR SVG使用 opaque seed：server与首次client render写入同一稳定 `dangerouslySetInnerHTML`，后续React render不再改写renderer-owned descendants。首次layout effect以adopt模式接管；matching seed保留descendant identity，mismatch在首次committed callback前replace。StrictMode effect replay与最终unmount对每个renderer instance都 exactly-once dispose。

Vanilla对 IR/plain spec返回 `mode: 'retained'` view，对预编译 Scene返回 `mode: 'static'` view。Retained view的 `update()`把下一轮 normalization、runtimeMeta、artifacts、animation与可变Canvas config放进同一session transaction；失败保持全部旧值与对象identity。Canvas DPR只在mount决定，变化必须dispose/remount。`view.hydrate()`以可回滚handler contribution transaction添加和移除注册。

Plain spec每轮可按datasets生成新的composite callback，但Definition数量、顺序/key、schema identity、expand/compile分支与artifact schema必须在session内稳定。稳定delegate在prepare切换candidate callback；失败rollback旧callback，成功同时推进内部composite revision owner，确保结构等价IR也会让Core重新编译并消费新数据。

### Hydration、resource 与 animation 同步提交

一次commit同步切换Scene snapshot、DOM/display list、geometry/hit-test index、handler mapping、resource consumer set与animation state。Handler contribution按registration升序合并，同publicId/event不覆盖；handle只移除自身，失败可重试。

Resource以canonical descriptor与candidate/committed consumer set staging，新consumer可见前先创建，旧consumer移除后再释放。Animation对unchanged/move保留clock；静态update且track descriptor相同保留，descriptor变化重启该identity，remove释放，replace重启全部。

`VanillaLayerCache`在alpha.2只作为未来失效优化的metadata hint：Vanilla把layer metadata保留在`runtimeMeta`，并折叠为`RenderRuntimeConfig.cachePolicy`；Render只校验和冻结该字段，SVG/Canvas renderer尚不消费它，也不启用auto/static/dynamic复用。该hint不改变画面、hit-test或transaction行为；真正的layer fingerprint、复用与等价性门禁留给后续独立contract。Kernel不会为提前启用复用而建立Vanilla layer到Core identity的平行映射。

## 被否决的方案

- **从裸 Scene 或DOM猜 synthetic identity**：无法证明anonymous/duplicate/multi-primitive owner的稳定映射，也会让renderer成为第二真源
- **React继续声明SVG descendants并由effect patch**：形成reconciliation与renderer双写，hydration和rollback无法原子
- **无效Patch统一replace**：会掩盖Core/第三方contract缺陷，使错误输入看似成功
- **participant在publish后现场read renderer**：read失败会留下logical与view分裂，且无法原子切换多个participant cache
- **Vanilla按layer index建立私有topology**：让Render反向依赖adapter语义，并与Core identity产生平行机制
- **为旧static update保留同名兼容桥接**：retained/static mode需要在类型和运行时明确判别；0.x阶段直接采用正确边界

## 公开契约与兼容性

- Core新增runtime-only Scene snapshot/topology/Patch contract，不修改持久IR/Scene schema
- Runtime新增commit participant与session-bound read；未传participants时保持ADR-03既有行为
- Render新增`@retikz/render/runtime` public subpath、retained factory/definition/participant/config与内置SVG/Canvas实现
- React从package root导出`LayoutRuntimeOptions`，`<Layout runtime>`进入retained session
- Vanilla IR/plain spec mount返回retained view并支持transactional update/diagnostics；预编译Scene继续static full render
- 这是0.x公开行为调整，不提供旧写法别名或平行协议

## 性能边界

确定性门禁固定5000实体的Core full/single update、SVG/Canvas initial/entity/group/fallback与dispose live handles。`pnpm bench:check`同时验证Scene/DOM/pixel oracle、Patch/trace基数、未变SVG identity、Canvas index与`liveHandles=0`，wall-clock不能替代确定性证据。

Timing只在完整environment fingerprint一致时比较。Fingerprint覆盖expected Node 24.x、lockfile Chromium、1440×900、DPR 1、动画关闭、Arial、en-US/UTC、5次warm-up/30 samples，以及实际Node/browser。Tracked baseline只含12个5000规模场景；median/p95不得超过同场景baseline 1.20×，max超过2.00×会触发一次同fingerprint完整重跑。

相对p95上界冻结为：Core entity update/initial 0.50×；SVG entity/group 0.25×/0.50×；Canvas entity/group 1.50×/1.25×；SVG/Canvas replace fallback与同一`none` factory initial分别2.00×/2.50×。Fingerprint不匹配、重跑fingerprint漂移或连续unstable都不能形成PASS；baseline只能由显式命令生成候选并经人工审查。

## 最终实现

- Runtime participant lifecycle、ownership、diagnostics、trace、read cache与rollback/broken envelope已实现
- Core Program支持额外invalidation owner，并以canonical topology/Patch作为Render输入
- Render完成validator、capability fallback、lineage、内置SVG/Canvas retained transaction、resource/hydration/animation与Canvas dirty-region路径
- React完成host-shell、SSR adopt、StrictMode、commit后callback/ref与诊断出口
- Vanilla完成retained/static判别、atomic update、composite callback transaction、runtimeMeta/artifact与hydration contribution
- Bench完成5000 deterministic fixture、真实dispose probe、环境fingerprint、tracked timing baseline与机器门禁
- Core、Runtime、Render、React、Vanilla双语文档已同步

实现分为 `7f735ff72`、`71dd7ce21`、`e0814e1a6`、`db99688a7`、`46854afe9`、`7db98044a` 六个主要提交，并由 `3c5a252a6` 补强失败契约验收证据。

## 验证结果

- Runtime：169 tests
- Core：2825 tests
- Render：52 files / 474 tests
- React：47 files / 429 tests
- Vanilla：13 files / 103 tests
- Bench：8 files / 31 tests；`bench:check` 18项预算PASS；fingerprint `9b28319e` timing compare PASS
- Docs：kernel integrity 83 pages、ESLint、TypeScript与production build PASS；zh/en真实页面完成浏览器视觉复核
- 独立Bug Hunter、docs review与逐commit staged review的BLOCKING/WARNING均已清空

## 遗留边界

- progressive materialization、scheduler、Worker与Concurrent presentation不在本ADR范围
- selection、drag、brush、zoom与domain intent留给后续interaction contract
- WebGL、远端renderer、跨页面cache与更细粒度Vanilla per-layer identity需要独立设计
- `VanillaLayerCache`的实际renderer复用、semantic fingerprint与auto/static/dynamic等价性门禁尚未实现
- React render-time仍需为SSR seed执行一次完整`compileToScene`；retained session减少的是commit/update成本，不承诺消除该render-time compile
