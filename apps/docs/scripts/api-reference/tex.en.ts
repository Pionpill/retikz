/**
 * `@retikz/tex` 中文 JSDoc 的审阅后英文投影
 *
 * 代码标识符、签名、枚举值与示例保持源码原样；仅翻译读者可见的说明文本
 */
const translations: Readonly<Record<string, string>> = {
  'TeX lowerer 配置': 'TeX lowerer configuration',
  '控制由 `createLowerTex` 创建的 lowerer 如何向外报告失败。它不改变 TeX 解析或缓存语义，成功结果仍直接返回给 Core 的文本编译流程':
    'Controls how a lowerer created by `createLowerTex` reports failures. It does not alter TeX parsing or cache semantics; successful results still flow directly into Core text compilation.',
  '每次公开 lowering 失败时接收一次诊断，供应用记录、提示或上报':
    'Receives one diagnostic for each public lowering failure so the application can log, notify, or report it.',
  'MathJax 引擎配置': 'MathJax engine configuration',
  '指定内置配置档及其额外扩展，供 `createMathJaxEngine`、`createMathJaxLowerTex` 与 React Hook 在初始化时解析。它不包含 MathJax 实例，也不控制公式绘制样式':
    'Selects a built-in profile and extra extensions for `createMathJaxEngine`, `createMathJaxLowerTex`, and the React Hook to resolve during initialization. It contains no MathJax instance and does not control formula styling.',
  选择基础或数学扩展集合的内置配置档: 'Selects the built-in profile for the base or math extension set.',
  '在配置档之后追加的扩展，重复项会在初始化前去重':
    'Appends extensions after the selected profile; duplicates are removed before initialization.',
  'MathJax 扩展取值': 'MathJax extension values',
  '由 `MathJaxExtension` 派生的受限字符串集合，可在内置配置档之后追加。配置解析会去重并按稳定顺序加载，调用方无需自行处理 package 顺序':
    'A constrained string set derived from `MathJaxExtension`, which can be appended after the built-in profile. Configuration resolution deduplicates and loads values in a stable order, so callers do not need to manage package order.',
  '一步创建 MathJax 引擎与 Core lowerer 的配置':
    'Configuration for creating a MathJax engine and Core lowerer in one step',
  '合并 `MathJaxEngineOptions` 的解析配置与 `LowerTexOptions` 的诊断回调，作为 `createMathJaxLowerTex` 的单一输入。它只描述工厂参数，不保存引擎、缓存或渲染状态':
    'Combines the resolution configuration from `MathJaxEngineOptions` with the diagnostic callback from `LowerTexOptions` as the single input to `createMathJaxLowerTex`. It describes factory arguments only and stores no engine, cache, or rendering state.',
  'MathJax 配置档取值': 'MathJax profile values',
  '由 `MathJaxProfile` 派生的受限字符串集合，用于选择内置扩展组合；它只描述配置值，实际扩展加载由 MathJax 工厂负责':
    'A constrained string set derived from `MathJaxProfile` for selecting a built-in extension set. It describes configuration values only; the MathJax factory performs the actual extension loading.',
  '同步 TeX → SVG 引擎接口': 'Synchronous TeX-to-SVG engine interface',
  '定义 `createLowerTex` 所需的最小引擎边界：输入 TeX 字符串和 display 选项，输出可由本包 SVG lowerer 消费的标记。调用方可使用内置 MathJax 工厂，也可注入兼容实现；通用 SVG 导入与渲染不属于该接口':
    'Defines the minimal engine boundary required by `createLowerTex`: it accepts a TeX string and display option, then returns markup consumable by this package’s SVG lowerer. Callers may use the built-in MathJax factory or inject a compatible implementation; general SVG importing and rendering are outside this interface.',
  '把一段 TeX 和 display 模式转换成受支持的 SVG 标记': 'Converts TeX and display mode into supported SVG markup.',
  'TeX lowering 诊断': 'TeX lowering diagnostic',
  '描述引擎执行、MathJax 解析或 SVG 降解阶段不能产出公式路径的原因。它只承载可展示或记录的失败事实，不负责错误恢复；调用方可通过 `LowerTexOptions.onDiagnostic` 决定如何提示用户':
    'Describes why the engine, MathJax parsing, or SVG lowering phase could not produce formula paths. It carries displayable or loggable failure facts only and does not recover errors; callers choose how to notify users through `LowerTexOptions.onDiagnostic`.',
  '可按需加载的 MathJax TeX 扩展': 'MathJax TeX extensions that can be loaded on demand',
  '值与 MathJax configuration 的扩展标识保持一致，并由 profile 解析阶段统一校验、去重和加载。它提供可传给引擎配置的稳定扩展标识':
    'Values match MathJax configuration extension identifiers and are validated, deduplicated, and loaded together during profile resolution. It provides stable extension identifiers for engine configuration.',
  '内置 MathJax 配置档': 'Built-in MathJax profiles',
  '`base` 仅启用基础 TeX 配置，`math` 额外启用常用数学扩展集合。它提供 `createMathJaxEngine` 与 lowerer 工厂可识别的扩展集合选择，不创建引擎，也不改变已创建实例':
    '`base` enables only the base TeX configuration, while `math` additionally enables common math extensions. It selects an extension set recognized by `createMathJaxEngine` and lowerer factories; it neither creates nor changes an engine instance.',
  '把同步 SVG engine 适配为 Core `LowerTex`，并缓存确定的解析结果':
    'Adapts a synchronous SVG engine to Core `LowerTex` and caches deterministic results',
  '接收能输出受支持 SVG 子集的引擎与可选诊断回调，返回可直接注入 Core 文本编译流程的同步 lowerer。该函数负责 TeX → SVG → 路径的降解和结果缓存，不负责初始化引擎或渲染公式':
    'Accepts an engine that emits the supported SVG subset and an optional diagnostic callback, then returns a synchronous lowerer that can be injected directly into Core text compilation. This function performs TeX-to-SVG-to-path lowering and result caching; it does not initialize the engine or render formulas.',
  '提供同步 TeX → SVG 转换能力的引擎': 'An engine that provides synchronous TeX-to-SVG conversion.',
  '控制 lowering 失败诊断的可选配置': 'Optional configuration for lowering-failure diagnostics.',
  '可注入 Core 文本编译流程的同步 `LowerTex`':
    'A synchronous `LowerTex` that can be injected into Core text compilation.',
  '创建基于可选 `mathjax-full` peer 的同步 TeX → SVG 引擎':
    'Creates a synchronous TeX-to-SVG engine from the optional `mathjax-full` peer dependency',
  '异步加载并配置 `mathjax-full`，返回可被 `createLowerTex` 反复同步调用的引擎。输入配置只影响启用的 TeX 扩展；返回值只负责 TeX → SVG，不承担 SVG 路径降解、缓存或 Core 注入':
    'Asynchronously loads and configures `mathjax-full`, returning an engine that `createLowerTex` can invoke synchronously and repeatedly. Input configuration affects only enabled TeX extensions; the returned value handles TeX-to-SVG only, not SVG path lowering, caching, or Core injection.',
  '控制内置 profile 与附加 TeX 扩展的可选配置':
    'Optional configuration for the built-in profile and additional TeX extensions.',
  '可同步执行 TeX → SVG 转换的 `MathJaxSvgEngine`':
    'A `MathJaxSvgEngine` that can synchronously perform TeX-to-SVG conversion.',
  '`mathjax-full` 无法加载或初始化时': 'When `mathjax-full` cannot be loaded or initialized.',
  "使用字面量 dynamic import 支持打包器分包；`fontCache: 'none'` 让字形以内联路径输出":
    "Uses a literal dynamic import to support bundler code splitting; `fontCache: 'none'` outputs glyphs as inline paths.",
  '创建使用内置 MathJax profile 的 Core lowerer': 'Creates a Core lowerer using a built-in MathJax profile',
  '异步加载可选的 `mathjax-full`、建立同步 SVG 引擎，并返回可交给 Core 的 `LowerTex`。适合不需要替换引擎实现的场景；如果应用已有兼容引擎，使用 `createLowerTex` 保留引擎所有权':
    'Asynchronously loads the optional `mathjax-full`, creates a synchronous SVG engine, and returns a `LowerTex` for Core. Use it when the engine implementation does not need to be replaced; when the application already owns a compatible engine, use `createLowerTex` instead.',
  '同时控制 MathJax 扩展和 lowering 诊断的可选配置':
    'Optional configuration for both MathJax extensions and lowering diagnostics.',
  '建立完成后可注入 Core 文本编译流程的 `LowerTex`':
    'A `LowerTex` that can be injected into Core text compilation after initialization.',
  'MathJax lowerer 的异步初始化状态': 'Asynchronous initialization state of a MathJax lowerer',
  '表示当前 React 组件对应配置的引擎与 lowerer 是否可用：loading 时尚未完成初始化，ready 提供可传给 `@retikz/react` 的 `lowerTex`，error 提供可展示的诊断。它是 Hook 的输出快照，不保存跨组件的 UI 状态':
    'Indicates whether the engine and lowerer for the current React component configuration are available: loading has not finished initialization, ready provides `lowerTex` for `@retikz/react`, and error provides a displayable diagnostic. It is a Hook output snapshot and stores no UI state across components.',
  '按有效配置共享 MathJax engine，并异步创建当前组件的 lowerer':
    'Shares a MathJax engine by effective configuration and asynchronously creates the current component’s lowerer',
  '接收与根入口工厂一致的 MathJax 配置，复用同一有效扩展集合的引擎，并返回可判别的初始化状态。ready 状态中的 lowerer 应传入 `Layout` 等 React authoring 入口；本 Hook 不渲染公式，也不处理应用级错误界面':
    'Accepts the same MathJax configuration as the root-entry factories, reuses an engine for the same effective extension set, and returns a discriminated initialization state. Pass the lowerer in ready state to React authoring entry points such as `Layout`; this Hook does not render formulas or handle application-level error UI.',
  '控制 MathJax 扩展和 lowering 诊断的可选配置':
    'Optional configuration for MathJax extensions and lowering diagnostics.',
  '当前组件对应配置的 MathJax lowerer 初始化状态':
    'The initialization state of the MathJax lowerer for the current component configuration.',
};

/**
 * 将脚本生成后由 LLM 翻译、并经审阅的中文 JSDoc 投影为英文文案
 *
 * @description 每次新增中文说明先运行生成器，再补齐本映射并重新生成。运行时不调用 LLM；缺少映射时立即失败
 */
export const translateTexApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translation = translations[source];
  if (translation) return translation;
  throw new Error(`缺少 @retikz/tex API Reference 的审阅后英文翻译：${source}`);
};
