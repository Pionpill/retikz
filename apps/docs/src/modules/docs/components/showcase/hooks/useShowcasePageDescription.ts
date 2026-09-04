import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';

import { LANGS } from '@/i18n';
import { parseDocSource } from '@/modules/docs/lib';

type MdxLoader = () => Promise<string>;

const mdxLoaders: Record<string, MdxLoader | undefined> = import.meta.glob<string>('../../../contents/**/*.mdx', {
  query: '?raw',
  import: 'default',
});

const buildKey = (segments: ReadonlyArray<string>, lang: Lang): string =>
  `../../../contents/${segments.join('/')}/index.${lang}.mdx`;

/** 按当前语言优先级读取 Showcase 目标页面的 description */
export const loadShowcasePageDescription = async (segments: ReadonlyArray<string>, lang: Lang): Promise<string> => {
  const candidates = [lang, ...LANGS.filter(candidate => candidate !== lang)];
  for (const candidate of candidates) {
    const loader = mdxLoaders[buildKey(segments, candidate)];
    if (loader) return parseDocSource(await loader()).frontmatter.description;
  }
  return '';
};

/** 懒加载同类 Showcase 页面的 frontmatter description */
export const useShowcasePageDescription = (segments: ReadonlyArray<string>): string => {
  const { i18n } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const path = segments.join('/');
  const requestKey = `${path}:${lang}`;
  const [state, setState] = useState({ requestKey: '', description: '' });

  useEffect(() => {
    let active = true;
    void loadShowcasePageDescription(path.split('/'), lang)
      .then(description => {
        if (active) setState({ requestKey, description });
      })
      .catch(() => {
        if (active) setState({ requestKey, description: '' });
      });
    return () => {
      active = false;
    };
  }, [lang, path, requestKey]);

  return state.requestKey === requestKey ? state.description : '';
};
