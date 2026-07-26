# ADR-06：TeX 数学语法兼容

- 状态：Accepted
- 决策日期：2026-07-23
- 接受日期：2026-07-26
- 关联：[alpha.1 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

> Architecture Gate 第 3 轮 PASS 后获得实现授权；实现、对抗测试与双语文档完成后，于 2026-07-26 获得收尾确认。目标仍是选定的 MathJax TeX 数学 profile，不是完整 LaTeX 文档编译器。本记录不授权 commit、tag、publish 或 push。

## 背景

`@retikz/tex` 当前 engine 默认只注册 base configuration；仅把额外 package 名传给 TeX constructor 并不会加载对应 configuration。`LoweredTex` 又只有一组统一 `commands`，SVG parser 忽略内部 fill / stroke / opacity，因此 `\color`、`\colorbox` 等视觉语义无法进入 renderer-agnostic Scene。

Core 继续只拥有通用 lowering contract；MathJax profile、静态模块加载、SVG 解析与 cache 属于 `@retikz/tex`。

## 决策

### Engine profile

```ts
const MathJaxProfile = {
  Base: 'base',
  Math: 'math',
} as const;
type MathJaxProfileValue = ValueOf<typeof MathJaxProfile>;

const MathJaxExtension = {
  Ams: 'ams',
  Newcommand: 'newcommand',
  Boldsymbol: 'boldsymbol',
  Braket: 'braket',
  Cancel: 'cancel',
  Cases: 'cases',
  Centernot: 'centernot',
  Mathtools: 'mathtools',
  Color: 'color',
} as const;
type MathJaxExtensionValue = ValueOf<typeof MathJaxExtension>;

type MathJaxEngineOptions = {
  profile?: MathJaxProfileValue;
  extensions?: Array<MathJaxExtensionValue>;
};

type LowerTexOptions = {
  onDiagnostic?: (diagnostic: TexLoweringDiagnostic) => void;
};

type MathJaxLowerTexOptions = MathJaxEngineOptions & LowerTexOptions;
```

- 默认 `profile: 'base'`、`extensions: []`，与当前普通公式兼容。
- `math` profile 固定加载：`base`、`ams`、`newcommand`、`boldsymbol`、`braket`、`cancel`、`cases`、`centernot`、`mathtools`、`color`。
- `extensions` 只接受仓库静态 union，在 profile 后追加、稳定去重；未知值在 engine 创建时 throw。
- `cases` 稳定展开为内部依赖 `empheq` 后再加载 `cases`；`empheq` 不进入公开 extension union，也不能单独请求。
- 不默认加载 `all`、`html`、`noerrors`、`noundefined`、`physics`、`mhchem`、`textmacros` 或 `colorv2`。
- `createMathJaxEngine` 必须用字符串字面量动态 import MathJax 基础栈和选中的 3.2.2 configuration；禁止变量 specifier，也禁止在 `@retikz/tex` 根入口可达路径顶层 import optional peer。导入根入口、使用 `createLowerTex(customEngine)` 不得解析 `mathjax-full`。
- `upgreek`、`unicode` 与 `extpfeil` 不支持：前两者的代表 macro 输出 `<text>`；`extpfeil` 的 `\xlongequal` 输出依赖带裁剪语义的 nested viewport。当前纯路径 lowering 不引入字体轮廓或局部 clip 底座。
- 任意私有 MathJax 配置继续通过自定义 `MathJaxSvgEngine` 注入，不扩大公开 extension union。

canonical 顺序就是上述 union 顺序。配置与代表能力冻结为：

| extension  | MathJax configuration                        | 固定代表输入                                                                 | 必须 lower 的额外结构 |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------- | --------------------- |
| ams        | `AmsConfiguration`                           | `\dfrac{a}{b}`                                                               | path / use / rect     |
| newcommand | `NewcommandConfiguration`                    | `\newcommand{\foo}{x}\foo`                                                   | path / use            |
| boldsymbol | `BoldsymbolConfiguration`                    | `\boldsymbol{x}`                                                             | path / use            |
| braket     | `BraketConfiguration`                        | `\braket{\psi\|\phi}`                                                        | path / use            |
| cancel     | `CancelConfiguration`                        | `\cancel{x}`                                                                 | line                  |
| cases      | `EmpheqConfiguration` + `CasesConfiguration` | `\begin{numcases}{f(x)=}x&x>0\\-x&x\le0\end{numcases}`                       | path / use            |
| centernot  | `CenternotConfiguration`                     | `a\centernot=b`                                                              | path / use            |
| mathtools  | `MathtoolsConfiguration`                     | `a\coloneqq b`                                                               | path / use            |
| color      | `ColorConfiguration`                         | `\color{crimson}{x}` / `\colorbox{yellow}{x}` / `\fcolorbox{red}{yellow}{x}` | rect / polygon        |

SVG parser 必须按 document paint order 处理 path / use / rect / line / polygon：line 转 move+line，rect / polygon 转闭合 path。`defs` 中的模板不计 drawable，只在 `use` 处按引用位置 emit。

- 根 `<svg>` 必须有合法 viewBox；根元素外出现任意 nested `<svg>` 都归为 unsupported-svg，不静默省略 viewport clipping。
- presentation attribute 与 `style` 都按 `style` 优先、element attribute 次之、ancestor inheritance 最后解析。允许的 paint 属性只有 `color`、`fill`、`stroke`、`fill-opacity`、`stroke-opacity`、`stroke-width`、`fill-rule`；`opacity` 是 element / container 合成属性，不按普通 paint 属性继承。
- 根 `<svg style="vertical-align: ...">` 的 `vertical-align` 只影响 HTML inline 布局，由 Core viewBox metrics 替代，安全忽略。container 上的 CSS `border` 不绘制 SVG geometry；`\fcolorbox` 的边框已由 polygon 物化，因此安全忽略。其它 style property 归为 unsupported-svg。
- container 的显式 opacity 只有在其递归 drawable 后代数不超过 1 时才能下沉相乘；多 drawable container 归为 unsupported-svg。计数排除 defs 模板，包含 use / rect / line / polygon 与非 defs path。
- 先得到 cascade 后的 effective stroke。`stroke: none` 或 `strokeWidth === 0` 归一为无描边，不输出 stroke channel，也不限制 outline transform。可见描边只接受 similarity transform（线性矩阵两列正交且长度相等，允许 rotate / reflection / uniform scale），strokeWidth 乘统一 scale与最终 font-size scale；non-uniform scale、skew、singular / non-finite transform 归为 unsupported-svg。无可见描边的 outline 可把任意 finite non-singular affine 烘焙进 path points。

公开入口：

```ts
createMathJaxEngine(options?): Promise<MathJaxSvgEngine>;
createMathJaxLowerTex(options?: MathJaxLowerTexOptions): Promise<LowerTex>;
createLowerTex(engine: MathJaxSvgEngine, options?: LowerTexOptions): LowerTex;
useLowerTex(options?: MathJaxLowerTexOptions): LowerTex | undefined;
```

`createMathJaxLowerTex` 负责按 engine options 创建引擎，再把 `onDiagnostic` 注入 `createLowerTex`。React engine promise cache 只按 canonical profile / extensions 分桶，callback 不进入 engine identity；callback 变化不重建引擎或 lowerer，hook 通过最新 ref 转发诊断。

### Core lowering contract

用多 path 结果替换单一 commands：

```ts
type LoweredTexPaint = { kind: 'none' } | { kind: 'currentColor' } | { kind: 'color'; value: string };

type LoweredTexPath = {
  commands: Array<PathCommand>;
  fill: LoweredTexPaint;
  fillOpacity?: number;
  stroke: LoweredTexPaint;
  strokeWidth?: number;
  strokeOpacity?: number;
  opacity?: number;
  fillRule?: 'nonzero' | 'evenodd';
};

type LoweredTex = {
  paths: Array<LoweredTexPath>;
  width: number;
  height: number;
  depth: number;
};
```

- `LoweredTex` 以 `paths` 作为唯一的 drawable 输出结构。
- MathJax SVG parser 为每个 drawable 物化 fill / stroke 三态：`none` 禁用通道，`currentColor` 请求宿主颜色，`color` 保留内部显式色。禁止用 `undefined` 同时表示“无 paint”和“继承宿主”。
- SVG cascade 的初始 `color` 是内部宿主哨兵，`color` 属性按 SVG 规则继承。effective fill / stroke 为 `currentColor` 时，若 effective `color` 已被内部 style / attribute 设为显式色，则物化为 `{ kind: 'color', value }`；只有 effective `color` 仍是宿主哨兵时才物化 `{ kind: 'currentColor' }`。`color: currentColor` 保留当前继承结果，不把已解析的内部色重新退回宿主。
- Core 把 `currentColor` 解析为 MathRun.fill > Node 已解析 textColor（含 ADR-04）> `'currentColor'`；内部 `color` 不受宿主覆盖，`none` 不 emit 对应 PathPrim paint。
- `LoweredTexPath.fillRule` 省略时固定 `evenodd`，保持现有 glyph hole 语义。
- 每个 LoweredTexPath 发一个既有 PathPrim；effective path opacity = host opacity × run opacity × internal path opacity，fillOpacity / strokeOpacity 再分别作用于对应 paint。opacity=0 仍保留 primitive。
- 这是明确接受的 v0.5 语义：多个重叠 path 的 host / run opacity按 path 分别合成，不等价于 SVG group opacity，但 SVG / Canvas 结果一致，且不扩展 Scene Group 或 Canvas offscreen API。MathJax SVG 中显式带 opacity 且包含多个 drawable child 的 container group 归为 unsupported-svg，避免错误扁平化内部 group opacity。
- font size 控制缩放，font family / weight / style 不承诺映射到 MathJax。renderer 仍只消费既有 PathPrim，不新增 TeX primitive。

### 失败、诊断与 cache

- 不支持且影响视觉语义的 SVG element / style / transform：整次 lowering 返回 null，不允许部分成功。
- merror、非法 macro、未加载 extension、parser failure 返回 null；Core 沿用 `TEX_INVALID` 并跳过 math segment。
- 未注入 lowerer时，字符串 `$...$` sugar 保持当前 gating；显式 math run 沿用 `TEX_LOWERER_MISSING`。
- 公开 diagnostic 冻结为：

```ts
type TexLoweringDiagnostic =
  | { kind: 'engine-error'; source: string; message: string }
  | { kind: 'mathjax-error'; source: string; message: string }
  | { kind: 'unsupported-svg'; source: string; message: string }
  | { kind: 'malformed-svg'; source: string; message: string };
```

engine throw → engine-error；merror / 未定义 macro / 未加载 extension → mathjax-error；已解析但出现未支持 element / style / transform → unsupported-svg；缺 viewBox、非法 path / number / structure → malformed-svg。

- tex 内部 parser / engine 使用 discriminated result `{ok:true,value}` 或 `{ok:false,diagnostic,cacheable}`；public `LowerTex` 边界才折叠成 `LoweredTex | null`。
- 确定性 merror / unsupported-svg 的 null 可以缓存；engine throw 视为瞬态，不缓存。
- malformed-svg 与 mathjax-error 都是给定 engine / source 下的确定失败，缓存；所有失败调用一次 onDiagnostic，Core 对同一 math run 只发一次 `TEX_INVALID`。
- lowerer cache key 至少包含 source、display、fontSize、style color；engine / profile / extensions 由 lowerer 实例边界隔离。
- profile / extensions canonical key 用于 React engine promise cache；同配置并发共享，不同配置隔离。初始化失败删除 key，后续可重试；unmount 后不写 state。组件存活时 options A→B 立即把旧 lowerer 置为 undefined并递增 request token；B pending 期间不得返回 A，只有当前 token 可提交结果，较晚完成的 A 不得覆盖 B。
- `onDiagnostic` 不参与 engine / lowerer cache key；React callback 更新只替换转发 ref，后续失败与缓存失败重放都调用最新 callback。

## DSL / API

```tsx
const lowerTex = useLowerTex({
  profile: 'math',
  extensions: ['color'],
});

<Layout lowerTex={lowerTex}>
  <Node text={[{ kind: 'math', tex: String.raw`\color{crimson}{x^2}` }]} />
</Layout>;
```

Vanilla 继续通过 `compile.lowerTex` 注入同一个 `LowerTex`。

## 被否决的方案

- 在 Core 解析 TeX 或依赖 MathJax：破坏可选包与 renderer-neutral 边界。
- 只增加 `packages: string[]`：未静态加载 configuration，API 会继续给出虚假能力。
- 保留单 PathPrim 并丢弃内部颜色：不能称为选定语法兼容。
- 同时保留 `commands` 和 `paths`：会让 Core text layout 永久维护两套 contract。
- 默认加载全部扩展：包体、初始化、宏冲突和错误吞噬不可控。
- 为 `upgreek` / `unicode` 引入普通文本转轮廓：会扩大字体加载、字形映射与 renderer-neutral contract，不纳入本 profile。
- 为 `extpfeil` 引入 nested viewport / clip：会扩大 Core Scene、renderer 与 `LoweredTexPath` contract，只为单个宏引入不成比例的能力面。
- 为 extension 建通用 registry：MathJax 配置是 `@retikz/tex` 的闭合静态 profile；custom engine 已是扩展口。

## 公开影响

- 默认 base profile 的普通公式保持行为。
- `LoweredTex.paths` 是自定义 lowerer 的唯一多路径输出结构。
- `createMathJaxLowerTex(options)`、`useLowerTex(options)`、profile / extensions / diagnostics 是 additive。
- renderer 无新 API；Scene 中可能由一个 math run 发出多个 styled PathPrim。

## 最终实现与验证摘要

- Core 以 `LoweredTexPath` / paint 三态替换单一 `commands`，正文、Node label 与 edge label 共用多 path consumer。
- `@retikz/tex` 提供 base / math profile、9 个公开 extension、字面量 dynamic import、一次性 factory、细分 diagnostics、确定失败 cache 与 React hook 生命周期。
- MathJax SVG lowering 保留 drawable 顺序、paint / opacity / transform，并对 `<text>`、`<foreignObject>`、nested SVG、clip、不可表达 group opacity 与 transform 整次 fail-loud。
- React / Vanilla 透传同一 `LowerTex`；SVG / Canvas 只消费普通 `PathPrim`，没有 renderer 私有 MathJax 路径。
- README、TeX 包页面、API 表、边界说明与 profile demo 已完成 zh / en 同步。
- ignored 测试契约矩阵逐行回填 Core / Tex / adapter / renderer / docs 的具名正式证据；主线程 Bug Hunter 发现并修复 `clip-path` presentation attribute 被静默忽略的问题，正式回归测试通过，最后一轮无 BLOCKING。

## 遗留边界

- 不支持完整 LaTeX 文档、任意宏包、分页、表格或文档布局。
- 不把 `<text>` / `<foreignObject>` 转为轮廓，因此 `upgreek`、`unicode` 不进入公开 profile。
- 不提供通用 SVG importer、nested viewport / clip 或任意 CSS cascade，因此 `extpfeil` 不进入公开 profile。
- renderer 不直接调用 MathJax，也不映射 MathJax font family / weight 为普通文本字体。
