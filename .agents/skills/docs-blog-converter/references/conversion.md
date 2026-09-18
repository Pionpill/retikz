# 外站转换流程

## 输入与输出

输入 `apps/docs/src/modules/docs/contents/blog/<section>/<slug>/index.<lang>.mdx`，默认 zh。输出 `.markdown/<slug>/content.md` 与同级 SVG；先用 git check-ignore 确认输出目录已忽略，未忽略时按根规则征求新增临时目录的许可，不自行改 .gitignore。

双语输出 content.zh.md / content.en.md；图内文字不同则使用 X.zh.svg / X.en.svg，按实际渲染内容判断，不能只看有无旧语言文件。

## 捕获 SVG

1. 从 ComponentPreview 的 files 提取主 demo：字符串直接取值，对象取 file，数组取第一项再解析；按正文顺序去重。
2. 复用当前工作区 docs 服务，端口按实际配置与输出，不固定写 7102。
3. 使用浏览器完成真实 DOM 文本测量后捕获 SVG，不以 SSR/jsdom 结果替代。

```bash
node .agents/skills/docs-blog-converter/scripts/grab-svg.mjs --url <actual-blog-url> --out .markdown/<slug> --demos <comma-separated-demo-ids>
```

脚本使用 Node 22 WebSocket 与系统浏览器 CDP；不能运行时可用预览器 Download SVG。本任务不安装新依赖或绕过当前环境的浏览器权限。

检查导出 SVG 的 CSS var/currentColor 是否已解析为独立可用颜色；主题色不能解析时在导出副本中固化实测颜色并验证。不要为了导出把源 demo 的主题适配改成固定颜色，也不自动提出 PR。

## Markdown 转换

| 源内容                  | 输出                                                        |
| ----------------------- | ----------------------------------------------------------- |
| frontmatter             | title 转 H1，description 转引言，date/tags 放末尾作者元数据 |
| ComponentPreview        | 对应 SVG，相对路径同目录，alt 说明观察重点                  |
| 站内路由                | 前缀当前部署地址 https://pionpill.github.io/retikz          |
| Comparison              | 保留与主线相关的对照内容，改普通 Markdown                   |
| 站内按钮、侧栏等说明    | 指明是 retikz 文档站功能，补足外站阅读语境                  |
| 代码围栏、br            | 保留语言和有效换行                                          |
| 未支持的自定义 MDX 组件 | 报告具体组件与内容，不能静默丢弃                            |

文末保留作者用的标题、摘要、日期、标签和原文链接，与正文明确分隔；保留正文引用清单，不添加无关链接。

## 验证与交付

- 无 frontmatter 或未转换 JSX 残留；代码块未损坏，标题与段落顺序保持。
- 每个图片链接存在，SVG 在脱离文档站样式后仍正确；检查字体、颜色、文字及边界。
- 站内链接已绝对化，外部链接未替换，语言对应。
- 用实际输出检查，不凭脚本退出成功宣布视觉正确。
- 交付本地 Markdown 和资源；上传、发布分别由用户授权。
