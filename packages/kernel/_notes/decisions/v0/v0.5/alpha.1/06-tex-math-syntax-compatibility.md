# ADR-06：TeX 数学语法兼容

- 状态：Accepted
- 决策日期：2026-07-23

## 背景

TeX engine 早期只加载 base configuration，额外 package 名不能保证对应 configuration；单一 `LoweredTex.commands` 又无法表达 `\color`、`\colorbox` 等 SVG paint 与多 drawable 结构。Core 只拥有通用 lowering contract，MathJax profile、静态加载、SVG 解析和 cache 归 `@retikz/tex`

## 决策

TeX 提供闭合 profile / extension 选择：

```ts
const MathJaxProfile = { Base: 'base', Math: 'math' } as const;
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

type MathJaxEngineOptions = {
  profile?: 'base' | 'math';
  extensions?: Array<MathJaxExtensionValue>;
};
```

默认 profile 为 base、extensions 为空；math profile 固定包含上述九项。extensions 在 profile 后追加并稳定去重，未知值在 engine 创建时 throw；`cases` 通过内部 empheq 依赖加载但 empheq 不公开。其它宏包与私有 configuration 只能通过自定义 engine 注入。可选 MathJax 依赖必须保持惰性字面量加载，导入根入口不能触发解析

`LoweredTex` 以多 path 作为唯一 drawable 输出：

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

type LoweredTex = { paths: Array<LoweredTexPath>; width: number; height: number; depth: number };
```

SVG parser 按 document paint order处理 path / use / rect / line / polygon；defs 模板只在 use 处物化，rect / polygon 转闭合 path。Presentation attribute 与 style 按 style、attribute、ancestor inheritance 解析；paint 只接受 color、fill、stroke、fill-opacity、stroke-opacity、stroke-width、fill-rule，opacity 作为 element / container 合成属性。根 svg 必须有合法 viewBox，nested svg、text、foreignObject、clip、不可表达 group opacity 和不支持 transform 不能静默省略

`fill` / `stroke` 三态明确区分 none、继承宿主 currentColor 和内部显式 color；缺省 fillRule 为 evenodd。每个 LoweredTexPath 生成一个既有 PathPrim，opacity 为 host × run × internal path；多 path opacity 按 path 合成，不新增 Scene Group 或 Canvas offscreen 语义

### 失败、诊断与 cache

不支持且影响视觉语义的 SVG 结构、MathJax error、非法 macro、缺 viewBox、非法 path / number / structure 或 non-similarity 可见 stroke transform 使整个 lowering 返回 null，不部分成功。诊断稳定分为 `engine-error`、`mathjax-error`、`unsupported-svg`、`malformed-svg`；Core 保持 `TEX_INVALID`、`TEX_LOWERER_MISSING` 语义。确定性失败可 cache，engine throw 不 cache；失败调用一次 onDiagnostic，同一 math run 只发一次 Core warning

Cache key 至少含 source、display、fontSize、style color，engine/profile/extensions 由 lowerer 实例隔离。React engine promise cache 按 canonical profile / extensions 分桶，callback 不参与 identity；旧请求不得覆盖更新后的 options

## 兼容性与最终结果

默认 base 普通公式保持；`LoweredTex.paths` 替代单一 commands，是自定义 lowerer 的唯一输出。create/use lowerer、profile、extensions 和 diagnostics 为 additive；renderer 仍只消费普通 PathPrim，可能由一个 math run 产生多个 styled PathPrim

## 遗留边界

不支持完整 LaTeX 文档、任意宏包、分页、表格、`<text>` / `<foreignObject>` 轮廓化、nested viewport / clip、任意 CSS cascade 或 MathJax font family / weight 映射
