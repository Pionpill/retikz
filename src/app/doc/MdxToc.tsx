import { cn, throttle } from '@/lib/utils';
import { FC, RefObject, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

export type MdxTocProps = {
  mdxRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  path: string;
};

const MdxToc: FC<MdxTocProps> = props => {
  const { mdxRef, contentRef, path } = props;
  const navigate = useNavigate();
  const location = useLocation();

  const { t } = useTranslation();
  const [toc, setToc] = useState<Array<{ level: number; label: string }>>([]);
  const [activeToc, setActiveToc] = useState<string>('');

  const scrollToTocAnchor = (anchor: string) => {
    const element: HTMLElement | null = document.getElementById(anchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTocClick = (anchor: string) => {
    scrollToTocAnchor(anchor);
    navigate(`${location.pathname}${location.search}#${anchor.replace('mdx:', '')}`, { replace: true });
  };

  useEffect(() => {
    const headings = mdxRef.current.querySelectorAll('h2, h3, h4');
    const toc = Array.from(headings).map(heading => ({
      level: Number(heading.tagName.toLowerCase().replace('h', '')),
      label: heading.id,
    }));
    setToc(toc);
  }, [path]);

  useEffect(() => {
    const headings = mdxRef.current.querySelectorAll<HTMLElement>('h2, h3, h4');
    const tocInfo = Array.from(headings).map(heading => ({
      label: heading.id,
      offsetY: heading.offsetTop,
    }));
    scrollToTocAnchor(`mdx:${decodeURIComponent(location.hash.replace('#', ''))}`);
    return contentRef.current.addEventListener(
      'scroll',
      throttle(() => {
        for (let i = 0; i < tocInfo.length; i++) {
          const toc = tocInfo[i];
          if (toc.offsetY - contentRef.current.scrollTop > 20) {
            setActiveToc(i === 0 ? '' : tocInfo[i - 1].label);
            break;
          }
        }
      }, 100),
    );
  }, []);

  return (
    <div className="hidden sticky top-0 xl:flex flex-col w-48 border-l py-4">
      <div className="flex flex-col gap-2">
        <span
          className="hover:text-blue-500 transition-all cursor-pointer ml-4 font-bold items-center flex gap-2 opacity-60"
          onClick={() => {
            contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Text size="18" />
          {t('doc.thisPage')}
        </span>
        {toc.map(item => (
          <div className="flex relative">
            {activeToc === item.label && (
              <span className="absolute left-0 h-full w-[2px] bg-blue-500 translate-x-[-1px]" />
            )}
            <span
              className={cn('hover:text-blue-500 hover:opacity-100 transition-all cursor-pointer opacity-60', {
                'text-base pl-4 font-bold': item.level === 2,
                'text-sm pl-8': item.level === 3,
                'text-xs pl-12': item.level === 4,
                'opacity-100': item.label === activeToc,
              })}
              key={item.label}
              onClick={() => handleTocClick(item.label)}
            >
              {item.label.replace('mdx:', '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MdxToc;
