const translations: Record<string, string> = {
  '作者侧 Inspector 定义；仅在对应输入输出可由默认行为满足时允许省略选项字段':
    'Author-facing Inspector definition; options fields may be omitted only when defaults satisfy their input and output types',
  'registry 接收的异构作者定义，注册时统一补齐选项 schema 与 resolver':
    'Heterogeneous author definitions accepted by registries, with options schemas and resolvers completed at registration',
  '补齐默认选项契约并冻结 Inspector；省略 schema 时只接受空对象，省略 resolver 时使用 schema 输出':
    'Completes default options contracts and freezes an Inspector; an omitted schema accepts only an empty object, and an omitted resolver uses schema output',
  'Inspect 包统一的结构化错误': 'The structured error shared by the Inspect package',
  'registry 内擦除具体泛型后的 Inspector 定义':
    'An Inspector definition with concrete generic types erased for registry storage',
  'Inspector callback 的稳定外观上下文': 'Stable appearance context for Inspector callbacks',
  'primary 与辅助结果的原子 compile 输出': 'Atomic compilation output containing primary and auxiliary results',
  '一个 fragment warning 的 Inspect-owned diagnostic': 'An Inspect-owned diagnostic for a fragment warning',
  'Inspect fail-loud 错误及非致命 fragment diagnostic 的结构化来源':
    'Structured origins of thrown Inspect errors and non-fatal fragment diagnostics',
  '有序、只读的 Inspector 辅助平面': 'An ordered, read-only Inspector auxiliary plane',
  '一个辅助 Scene plane entry': 'An auxiliary Scene plane entry',
  '一次 compile 的 runtime-only Inspector selection': 'Runtime-only Inspector selection for one compilation',
  'Inspector selection 的单条规则：request 控制单个 Inspector，barrier 封锁一个范围内的全部 Inspector':
    'One selection rule: a request controls one Inspector; a barrier blocks all Inspectors within a scope',
  'Inspector selection 的目标 locator': 'The target locator for Inspector selection',
  'Inspector callback 读取的最终 occurrence 上下文': 'Final occurrence context available to an Inspector callback',
  '独立于 Core owner Definition 的 Inspector 定义': 'An Inspector definition independent of the Core owner Definition',
  'Inspector registry 的公开复合键': 'The public composite key for an Inspector registry',
  'Inspector 可返回的普通 Core IR child': 'Ordinary Core IR children that an Inspector can return',
  'Inspector Definition 的 immutable registry': 'An immutable registry of Inspector Definitions',
  'selection 解析出的 canonical request': 'A canonical request resolved from selection rules',
  'Inspect 包稳定错误码取值': 'Stable error code values for the Inspect package',
  'Inspect 包错误的结构化构造参数': 'Structured constructor options for Inspect errors',
  '默认 registry 使用的内置 Inspector definitions': 'Built-in Inspector definitions used by the default registry',
  '按 Core 的编译顺序比较两个实例定位器': 'Compares two occurrence locators in Core compilation order',
  'Inspect 使用的单一 Core observer key': 'The single Core observer key used by Inspect',
  'Inspect 包稳定错误码': 'Stable error codes for the Inspect package',
  '内置 stroke Path 控制点 Inspector': 'The built-in stroke Path control-point Inspector',
  '内置 Core stroke Path Inspector key': 'The built-in Core stroke Path Inspector key',
  '内置 stroke Path Inspector 选项及默认值': 'Options and defaults for the built-in stroke Path Inspector',
  '在 Core 遍历前校验选择结构、定位器、注册表与稀疏选项':
    'Validates selection structure, locators, registries, and sparse options before Core traversal',
  '判断作者站点是否可能命中选择规则，以便按需发布所属者产物':
    'Checks whether an authored site may match selection rules so owner output can be published on demand',
  '校验、脱离并深冻结 JSON-safe plain data': 'Validates, detaches, and deeply freezes JSON-safe plain data',
  '基于 Core observed compile 执行一次原子 Inspector compile':
    'Runs an atomic Inspector compilation using Core observed compilation',
  '创建内置优先、第三方同路的默认 Inspector registry':
    'Creates the default Inspector registry with built-ins first and the same path for third-party definitions',
  '为 static 或 retained Core compile 创建一次 Inspect observer definition':
    'Creates an Inspect observer definition for static or retained Core compilation',
  '创建无全局状态的 Inspector registry': 'Creates an Inspector registry without global state',
  '校验并冻结一个独立 Inspector Definition': 'Validates and freezes an independent Inspector Definition',
  '把公开 Inspector key 转为无歧义的 registry 内部键':
    'Converts a public Inspector key into an unambiguous internal registry key',
  '消费已准入规则；observer 的多次 session 复用同一稀疏 Source':
    'Consumes admitted rules; observer sessions reuse the same sparse Source',
  '从同 revision Core primary 与 observer outputs 组装原子 Inspect 结果':
    'Assembles an atomic Inspect result from Core primary and observer outputs of the same revision',
  '根据最终观察结果解析选择规则，并分配连续的外观颜色序号':
    'Resolves selection rules against final observations and assigns consecutive appearance color indices',
  '移除辅助 Scene 的公共 identity、meta 与 animation，并深冻结保留资源引用':
    'Removes public identity, meta, and animation from an auxiliary Scene and deeply freezes retained resource references',
  '校验并冻结 registry 与公开 define 共用的擦除后 Definition':
    'Validates and freezes the type-erased Definition shared by the registry and public define helper',
  'callback output 做 JSON-safe 脱离、dense 校验与 Core child schema 恢复':
    'Detaches callback output as JSON-safe data, checks array density, and parses it with the Core child schema',
  '绑定 Inspect registry/selection/callback 的可选 Layout wrapper props':
    'Optional Layout wrapper props binding an Inspect registry, selection, and callbacks',
  '可选 Inspect Path wrapper props': 'Props for the optional Inspect Path wrapper',
  '可选 Inspect Scope wrapper props': 'Props for the optional Inspect Scope wrapper',
  '复用基础 Layout/static/retained runtime 的 Inspect 可选宿主':
    'An optional Inspect host reusing the base Layout and static or retained runtime',
  '复用基础 Path lowering、只附加 runtime-only Inspector authoring 标记':
    'Reuses base Path lowering and only attaches a runtime-only Inspector authoring marker',
  '复用基础 Scope lowering、只附加 runtime-only Inspector authoring 标记':
    'Reuses base Scope lowering and only attaches a runtime-only Inspector authoring marker',
  'Inspect Vanilla 编译驱动的固定配置': 'Fixed configuration for the Inspect Vanilla compilation driver',
  'Vanilla site 可声明一个 request、多个 request，或 barrier':
    'A Vanilla site can declare one request, multiple requests, or a barrier',
  'Vanilla 可选 authoring 声明的一项 Inspector request':
    'One Inspector request in an optional Vanilla authoring declaration',
  '创建只由 Inspect Vanilla 驱动识别的 opaque authoring 标记':
    'Creates an opaque authoring marker recognized only by the Inspect Vanilla driver',
  '创建绑定 Inspector registry、selection 与 committed callbacks 的 Vanilla 编译驱动':
    'Creates a Vanilla compilation driver binding an Inspector registry, selection, and committed callbacks',
  '把一个 Vanilla authored site 的可选标记转换为通用 InspectionSelection rules':
    'Converts optional markers on a Vanilla authored site into shared InspectionSelection rules',
};

/** 缺少受审阅英文说明时终止生成，避免中文回退进入英文参考 */
export const translateInspectApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translation = translations[source];
  if (translation) return translation;
  throw new Error(`缺少 @retikz/inspect API Reference 的审阅后英文翻译：${source}`);
};
