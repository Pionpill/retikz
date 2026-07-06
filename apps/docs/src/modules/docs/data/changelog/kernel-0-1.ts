import type { Release } from '../types';

export const kernelV01: Release = {
    minor: 'v0.1',
    stableDate: '2026-05-20',
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.1',
        description: {
          zh: '从 IR 重构基线出发,逐 alpha 补齐节点形状 / Path 增强 / 节点关系层,到 alpha.5 冻结 schema、beta 收敛命名、rc 冻结 API,最终切到稳定版。',
          en: 'From the IR redesign baseline, alphas add node shapes / path enhancements / the node-relations layer, alpha.5 freezes the schema, betas converge naming, rc freezes the API, ending at the stable cut.',
        },
        highlights: [
          {
            label: { zh: 'IR + Scene 编译器', en: 'IR + scene compiler' },
            content: {
              zh: 'framework-agnostic 的中间表示与编译器,零 React、零 DOM,IR 可序列化为 JSON',
              en: 'A framework-agnostic intermediate representation and compiler — zero React, zero DOM — with IR serializable to JSON',
            },
          },
          {
            label: { zh: '节点与 Path 全集', en: 'Node + path feature set' },
            content: {
              zh: '4 种节点形状 + 多行文本 / 字体 / 颜色;Path 折角 / 曲线三件套 / 路径级形状 / 箭头 / 边标注',
              en: '4 node shapes + multi-line text / font / color; path folds / the curve trio / path-level shapes / arrows / edge labels',
            },
          },
          {
            label: { zh: '节点关系层', en: 'Node-relations layer' },
            content: {
              zh: '节点间相对定位、`<Coordinate>` 占位节点、Node 边挂标签,以及 4 种相对定位形态',
              en: 'Relative positioning between nodes, the `<Coordinate>` placeholder, node-attached labels, and four relative-positioning forms',
            },
          },
          {
            label: { zh: 'schema 冻结与渲染目标无关化', en: 'Schema freeze + render-neutral core' },
            content: {
              zh: 'Scene primitive 去 SVG 字符串(结构化 `PathCommand` / `Transform`),Scene 边界改 `Layout`、dash 改 `dashPattern`',
              en: 'Scene primitives drop SVG strings (structured `PathCommand` / `Transform`); Scene bounds become `Layout`, dash becomes `dashPattern`',
            },
          },
        ],
        subVersions: [
          {
            version: '0',
            date: '2026-05-20',
            summary: {
              zh: '从 rc 通道切到稳定版本号,继承 rc.2 的 API surface 与文档体验,不引入破坏性变更。',
              en: 'Move from the rc channel to the stable version number, keeping the rc.2 API surface and docs experience with no breaking changes.',
            },
            items: [

            ],
          },
          {
            version: 'rc.2',
            date: '2026-05-19',
            summary: {
              zh: '库代码限于渲染管线缺陷修复,无 schema / 公开 API 变更。',
              en: 'Library changes are limited to render-pipeline fixes; no schema / public API changes.',
            },
            items: [

            ],
          },
          {
            version: 'rc.1',
            date: '2026-05-16',
            summary: {
              zh: '公开 API surface 自此冻结,进入候选发布窗口;无 schema / 公开 API 变更。',
              en: 'The public API surface freezes here, entering the release-candidate window; no schema / public API changes.',
            },
            items: [

            ],
          },
          {
            version: 'beta.2',
            date: '2026-05-14',
            summary: {
              zh: '第二轮命名收敛:把公开 API 从 SVG / 历史大小写细节中抽离,为 rc 前的冻结做准备。',
              en: 'Second naming pass: lift public APIs out of SVG / historical-casing details ahead of the pre-rc freeze.',
            },
            items: [

            ],
          },
          {
            version: 'beta.1',
            date: '2026-05-13',
            summary: {
              zh: '在 alpha.5 schema 收尾后,集中做渲染目标无关化、公开类型 / JSDoc 补强、几何去重、性能优化与诊断加固;不新增公开能力。',
              en: 'After the alpha.5 schema wrap-up, focus on render-neutral wording, public types / JSDoc, geometry dedup, performance, and diagnostics; no new public capability.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-13',
            summary: {
              zh: '破坏性窗口最后一站:Scene primitive 去 SVG 字符串、箭头视觉规格对象化、StepLabel 位置扩展、新增 OffsetPosition。本版后 IR schema 冻结。',
              en: 'The last breaking window: structured Scene primitives, object-shaped arrow spec, expanded StepLabel position, and OffsetPosition. The IR schema freezes after this.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-12',
            summary: {
              zh: '节点关系层一次到位:节点间相对定位、Coordinate 占位节点、Node 边挂标签。',
              en: 'The node-relations layer in one wave: relative positioning between nodes, the Coordinate placeholder, and node-attached labels.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-10',
            summary: {
              zh: 'Path 增强一波到位:曲线三件套、路径级形状、相对坐标、边标注、视觉属性补齐。',
              en: 'Path enhancements in one wave: the curve trio, path-level shapes, relative coordinates, edge labels, and visual-prop fill-out.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-09',
            summary: {
              zh: 'Node 美化层 P1 全集:多行文本、字体对象、分轴边距、颜色 / 不透明度 / 描边样式 / 尺寸约束 / 缩放。',
              en: 'Node visual P1 in full: multi-line text, font object, axis-specific seps, color / opacity / stroke style / size constraints / scaling.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-09',
            summary: {
              zh: 'P0 + P1 流程图 / UML / 状态机刚需:节点 4 形状、path 折角 / 闭合 / 多端箭头 / 区域填色、显式锚点引用。',
              en: 'P0 + P1 essentials for flow charts / UML / state machines: 4 node shapes, path folds / closing / multi-end arrows / region fills, explicit anchor references.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.0',
            date: '2026-05-08',
            summary: {
              zh: '首版 npm 发布。retikz v0.1 重构基线,IR 居中——为后续 alpha 迭代打底。',
              en: 'First npm release. The retikz v0.1 redesign baseline with IR at the center — the foundation for upcoming alpha iterations.',
            },
            items: [

            ],
          }
        ],
      },
      {
        pkg: '@retikz/react',
        version: 'v0.1',
        description: {
          zh: '从单包组件库重构为薄 React adapter,Kernel + Sugar 双层 JSX 一对一映射 IR,逐 alpha 透传 core 新字段并补齐 sugar,到 rc / stable 冻结 API。',
          en: 'Refactored from a single component library into a thin React adapter; Kernel + Sugar JSX maps 1:1 to IR, forwarding new core fields and sugar across alphas, frozen at rc / stable.',
        },
        highlights: [
          {
            label: { zh: '薄 React adapter', en: 'Thin React adapter' },
            content: {
              zh: 'core 与 React 解耦,Kernel 直对应 IR 节点、Sugar 编译期展开为 Kernel',
              en: 'Core decoupled from React; Kernel maps 1:1 to IR nodes and Sugar compiles down to Kernel',
            },
          },
          {
            label: { zh: 'sugar 组件', en: 'Sugar components' },
            content: {
              zh: '`<Text>` 行级覆盖、`<EdgeLabel>` 边标注、`<Coordinate>` 占位节点,以及 Draw way DSL',
              en: '`<Text>` per-line overrides, `<EdgeLabel>`, the `<Coordinate>` placeholder, and the Draw way DSL',
            },
          },
          {
            label: { zh: 'BREAKING:命名收敛', en: 'BREAKING: naming convergence' },
            content: {
              zh: '顶层组件 `<Tikz>` → `<TikZ>`;`<Path>` / `<Draw>` 的 dash prop 改 `dashPattern`(数组)',
              en: 'Top-level `<Tikz>` → `<TikZ>`; the `<Path>` / `<Draw>` dash prop becomes `dashPattern` (an array)',
            },
          },
        ],
        subVersions: [
          {
            version: '0',
            date: '2026-05-20',
            summary: {
              zh: '切到稳定版本号,用户可直接安装 latest。',
              en: 'Move to the stable version number; users can install latest directly.',
            },
            items: [

            ],
          },
          {
            version: 'rc.2',
            date: '2026-05-19',
            summary: {
              zh: '三处渲染管线缺陷修复,无公开 API 变更。',
              en: 'Three render-pipeline fixes; no public API changes.',
            },
            items: [

            ],
          },
          {
            version: 'rc.1',
            date: '2026-05-16',
            summary: {
              zh: '组件名 / prop 名 / 公开类型自此冻结。',
              en: 'Component names / prop names / public types freeze here.',
            },
            items: [

            ],
          },
          {
            version: 'beta.2',
            date: '2026-05-14',
            summary: {
              zh: '命名收敛:顶层组件大小写与 dash prop 对齐 TikZ 术语。',
              en: 'Naming convergence: top-level casing and the dash prop align with TikZ terminology.',
            },
            items: [

            ],
          },
          {
            version: 'beta.1',
            date: '2026-05-13',
            summary: {
              zh: 'unbuilder round-trip 覆盖补齐、字段表类型互锁、builder cast 收敛与命名清理。',
              en: 'Fill out unbuilder round-trip coverage, lock field-list types, narrow builder casts, and clean naming.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-13',
            summary: {
              zh: '透传 alpha.5 新字段:arrowDetail 对象、扩展 StepLabel position、OffsetPosition,并新增结构化 SVG 翻译 helper。',
              en: 'Forward the alpha.5 fields: the arrowDetail object, expanded StepLabel position, OffsetPosition, plus new structured-to-SVG translation helpers.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-12',
            summary: {
              zh: '透传节点关系层:nodeDistance、相对定位、新增 <Coordinate> kernel 组件、Node 边标签。',
              en: 'Forward the node-relations layer: nodeDistance, relative positioning, the new <Coordinate> kernel component, and node labels.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-10',
            summary: {
              zh: '透传 Path 增强:曲线 / 形状 / 相对坐标 / 边标注,新增 <EdgeLabel> sugar,Draw way DSL 一并支持。',
              en: 'Forward path enhancements: curves / shapes / relative coords / edge labels, with the new <EdgeLabel> sugar and Draw way DSL support.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-09',
            summary: {
              zh: '新增 <Text> 行级覆盖 sugar,Node children 直接支持多行,renderer 改多 tspan 渲染。',
              en: 'Add the <Text> per-line sugar, support multi-line Node children directly, and render with multiple tspans.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-09',
            summary: {
              zh: '透传节点形状 / path 视觉新字段,TikZ 容器按需注入 SVG marker,renderer 加 ellipse 与 GroupPrim 支持。',
              en: 'Forward node-shape / path-visual fields, inject SVG markers on demand, and add ellipse / GroupPrim support to the renderer.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.0',
            date: '2026-05-08',
            summary: {
              zh: '架构拆分:从单包组件库改为薄 React adapter,Kernel + Sugar 双层 JSX。',
              en: 'Architecture split: from a single component library to a thin React adapter with Kernel + Sugar JSX layers.',
            },
            items: [

            ],
          }
        ],
      }
    ],
  };
