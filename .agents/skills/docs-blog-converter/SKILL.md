---
name: docs-blog-converter
description: Use when converting a finished Retikz blog MDX article to external-platform Markdown and SVG assets.
---

# 博客外站转换

输入已定稿的 blog MDX，输出 Markdown 与浏览器捕获的 SVG；转换不包含上传、发布或修改原始 demo。

先读 [转换流程](references/conversion.md)，确认源语言、实际 docs URL 和已忽略的输出目录。脚本为 [grab-svg.mjs](scripts/grab-svg.mjs)，需要 Node 22+ 与本地 Edge/Chrome。

保留文章观点和顺序，转换后核对图片、链接和元数据。原稿事实或组件不满足转换条件时报告具体问题，不借转换重写源文档。
