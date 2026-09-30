import type { Release } from '../types';

/** Extension 首个 alpha 版本的变更 */
export const extensionV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/extension',
      version: 'v0.1',
      description: {
        zh: '官方节点形状、箭头、裁剪、流带定义与动画预设，统一从包根按需导入。',
        en: 'Optional node shapes, arrows, clips, ribbons, and animation presets, all imported from the package root.',
      },
      highlights: [
        {
          label: { zh: '流带端点标签（待发布）', en: 'Ribbon endpoint labels (unreleased)' },
          content: {
            zh: 'start.label / end.label 直接复用 Kernel BoundaryLabelSchema，支持多行、富文本、字体与颜色继承，以及 none / radial / tangent / 数值旋转。位置由最终端帽曲线的外向支撑线决定，内置与自定义端帽使用同一规则；可与中心线 Path.label 共存，并统一响应 Path.rotate / scale。',
            en: 'start.label / end.label directly reuse Kernel BoundaryLabelSchema, with multiline and rich text, inherited fonts and colors, and none / radial / tangent / numeric rotation. Position derives from the final cap curve support line, using the same rule for builtin and custom caps. Endpoint labels coexist with the centerline Path.label; all ribbon geometry and labels respond to Path.rotate / scale together.',
          },
        },
        {
          label: { zh: '流带端面与端帽（待发布）', en: 'Ribbon sections and caps (unreleased)' },
          content: {
            zh: 'start.direction / end.direction 独立控制端面轴线，支持角度、非零向量和极坐标，默认 auto 取中心线法线；不改变中心线走向。中心线标签仍沿中心线切线，端帽及端帽标签跟随最终端面。侧边默认采用弧长采样与 Math 过点曲线，端帽独立连接。自定义端帽与内置端帽共用 Definition；arc 使用局部圆心与弦宽。宽度改用 kind 区分的 fixed/taper/stops/profile 对象，各分支有独立 Schema；移除数值 width、start.width/end.width 和顶层 interpolation。迁移时将 samples 改为 sampling，将字符串 cap 改为 { name, params }，provider 数组参数改为 { profiles, caps }，并重新核对旧 direction 和 arc 圆心。boundary 保留原曲线且不接受采样或端帽配置。',
            en: 'start.direction / end.direction independently control the section axes with angles, nonzero vectors, or polar coordinates; auto defaults to the centerline normal without rerouting the centerline. Centerline labels retain the centerline tangent; caps and cap labels follow the final sections. Sides use arc-length sampling and Math through-point curves, with independent cap joins. Custom and builtin caps share a Definition; arc uses a local center and chord width. Widths now use fixed/taper/stops/profile objects discriminated by kind, each with an independent schema. Numeric width, start.width/end.width, and top-level interpolation are removed. Replace samples with sampling, string caps with { name, params }, and provider array arguments with { profiles, caps }; reinterpret existing direction and arc centers. Boundary mode preserves authored curves and rejects sampling or cap options.',
          },
        },
        {
          label: { zh: '独立官方扩展包', en: 'Independent official extension package' },
          content: {
            zh: '原 Standard 扩展子入口迁至 @retikz/extension 根入口。集合与名称常量采用 Extension 前缀，扩展错误使用 RetikzExtensionError；绘图输入、注册 key 与渲染行为保持不变。所有包和文档消费者同步迁移，不保留旧入口或别名。',
            en: 'Standard provider subpaths move to the @retikz/extension root. Collections and name constants use the Extension prefix; extension errors use RetikzExtensionError. Drawing inputs, registration keys, and rendering behavior are unchanged. Package and docs consumers migrate together, with no old entry points or aliases.',
          },
        },
        {
          label: { zh: '动画效果预设', en: 'Animation effect presets' },
          content: {
            zh: 'grow、growUp、pulse、spin、flash、blink、wiggle 及专属选项统一从 Extension 根入口导入，替代原 Core 效果预设入口。Core 保留基础预设与通用轨道工具；效果默认值、已保存轨道 JSON 和播放机制不变。',
            en: 'Import grow, growUp, pulse, spin, flash, blink, wiggle and their options from the Extension root instead of their former Core entry. Core retains basic presets and track utilities; defaults, saved track JSON, and playback are unchanged.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-09-22',
          summary: {
            zh: '首次提供独立的官方节点形状、箭头、裁剪、Ribbon 与动画效果预设；依赖 Kernel 0.5.0-alpha.5，统一根入口，不自动注册，无独立 React / Vanilla 适配包。',
            en: 'Introduces independent official node shapes, arrows, clips, Ribbon, and animation effect presets. Depends on Kernel 0.5.0-alpha.5, with one root entry, no automatic registration, and no separate React or Vanilla adapters.',
          },
          items: [],
        },
      ],
    },
  ],
};
