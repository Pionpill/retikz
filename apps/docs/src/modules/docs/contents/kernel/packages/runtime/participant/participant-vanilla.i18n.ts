import type { Lang } from '@/i18n';

/** Vanilla 参与者数据流的双语文案 */
export const participantVanillaI18n: Record<
  Lang,
  Record<'update' | 'core' | 'result' | 'renderer' | 'publish' | 'processingRead' | 'renderRead', string>
> = {
  zh: {
    update: 'runtime.update(...)',
    core: 'Core 候选结果',
    result: '处理结果参与者\n准备 ProcessingResult',
    renderer: '渲染参与者\n准备画面修改',
    publish: '提交与读取均成功\n统一发布，更新返回',
    processingRead: 'Vanilla 读取缓存\nProcessingResult → 调用方',
    renderRead: '渲染封装读取缓存\nframe / animation → 宿主',
  },
  en: {
    update: 'runtime.update(...)',
    core: 'Core candidate output',
    result: 'Result participant\nPrepare ProcessingResult',
    renderer: 'Renderer participant\nPrepare drawing changes',
    publish: 'Commits and reads succeed\nPublish, then return',
    processingRead: 'Vanilla reads cache\nProcessingResult → caller',
    renderRead: 'Renderer wrapper reads cache\nframe / animation → host',
  },
};
