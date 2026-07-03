import type { RendererMode } from '../types';

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadDataUrl = (dataUrl: string, fileName: string): void => {
  const [header = '', payload = ''] = dataUrl.split(',');
  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const binary = window.atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  downloadBlob(new Blob([bytes], { type: mimeType }), fileName);
};

const downloadSvg = (renderPane: HTMLElement, fileName: string): void => {
  const svg = renderPane.querySelector('svg');
  if (!svg) return;
  let svgSource = new XMLSerializer().serializeToString(svg);
  // 序列化 React 渲染出的 svg 不一定带 xmlns；离线打开 / 嵌别处时缺它会被当 HTML 解析。
  if (!/\sxmlns=/.test(svgSource)) {
    svgSource = svgSource.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  downloadBlob(
    new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgSource}`], {
      type: 'image/svg+xml;charset=utf-8',
    }),
    `${fileName}.svg`,
  );
};

const downloadCanvas = (renderPane: HTMLElement, fileName: string): void => {
  const canvas = renderPane.querySelector('canvas');
  if (!canvas) return;
  try {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(blob => {
        if (!blob) return;
        downloadBlob(blob, `${fileName}.png`);
      }, 'image/png');
      return;
    }
    downloadDataUrl(canvas.toDataURL('image/png'), `${fileName}.png`);
  } catch {
    // canvas 可能因跨域图片被标记为 tainted，此时浏览器会阻止导出。
  }
};

/** 下载当前预览图：SVG 模式导出 `.svg`，Canvas 模式导出 `.png`。 */
export const downloadPreviewImage = (
  renderPane: HTMLElement | null,
  name: string,
  rendererMode: RendererMode,
): void => {
  if (!renderPane) return;
  const fileName = name || 'retikz';
  if (rendererMode === 'canvas') {
    downloadCanvas(renderPane, fileName);
    return;
  }
  downloadSvg(renderPane, fileName);
};
