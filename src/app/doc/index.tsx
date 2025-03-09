import { getRawApi } from '@/api/github';
import { SidebarProvider } from '@/components/ui/sidebar';
import useLang from '@/hooks/useLang';
import useModule from '@/hooks/useModule';
import { FC, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SideContent, SideMenu } from './components/side-bar';
import { moduleConfig } from './config/module';
import { MdxContent } from '@/components/shared/mdx';

const Doc: FC = () => {
  const module = useModule();
  const { lang } = useLang();
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path');

  const [source, setSource] = useState('');

  useEffect(() => {
    if (!path) return;

    getRawApi(moduleConfig[module].repos, `doc/${lang}/${path}`).then(res => {
      setSource(res);
    });
  }, [module, lang, path]);

  return (
    <SidebarProvider>
      <SideMenu />
      <SideContent>
        <MdxContent content={source} />
      </SideContent>
    </SidebarProvider>
  );
};

export default Doc;
