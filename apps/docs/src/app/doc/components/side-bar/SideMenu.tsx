import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { FC, Fragment, useEffect, useState } from 'react';
import FooterActions from './FooterActions';
import FooterAuthor from './FooterAuthor';
import HeaderInfo from './HeaderInfo';
import MenuItem from './MenuItem';
import { moduleConfig } from '../../config/module';
import { ContentType, getContentsApi } from '@/api/github';
import useModule from '@/hooks/useModule';
import useLang from '@/hooks/useLang';

const SideMenu: FC = () => {
  const module = useModule();
  const { lang } = useLang();

  const [rootContents, setRootContents] = useState<ContentType[] | null>(null);

  useEffect(() => {
    const getContent = (reposName: string, path: string) =>
      getContentsApi(reposName, path).then(async res => {
        const itemsWithChildren = await Promise.all(
          res.map(async item => {
            if (item.type === 'dir') {
              item.children = await getContent(reposName, item.path);
            }
            return item;
          }),
        );
        return itemsWithChildren;
      });

    getContent(moduleConfig[module].repos, `doc/${lang}`).then(res => {
      setRootContents(res);
    });
  }, [lang, module]);

  const getShownLabel = (name: string) => (name.split('_')[1] || name.split('_')[0]).split('.')[0];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <HeaderInfo />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        {rootContents ? (
          <SidebarGroup>
            {rootContents.map(rootItem => (
              <Fragment key={rootItem.sha}>
                <SidebarGroupLabel>{getShownLabel(rootItem.name)}</SidebarGroupLabel>
                <SidebarMenu>
                  {rootItem.children?.map(item => (
                    <MenuItem key={item.sha} item={item} />
                  ))}
                </SidebarMenu>
              </Fragment>
            ))}
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <FooterActions />
        <FooterAuthor />
      </SidebarFooter>
    </Sidebar>
  );
};

export default SideMenu;
