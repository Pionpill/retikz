import { ContentType } from '@/api/github';
import { moduleConfig } from '@/app/doc/config/module';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import useLang from '@/hooks/useLang';
import useModule from '@/hooks/useModule';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { ChevronRight, FileCode2 } from 'lucide-react';
import { FC, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

const MenuItem: FC<{ item: ContentType }> = props => {
  const { item } = props;

  const module = useModule();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const folderLabel = useMemo(() => (item.name.split('_')[1] || item.name.split('_')[0]).split('.')[0], [item.name]);

  const FolderIcon = useMemo(() => {
    const key = folderLabel.toLocaleLowerCase();
    return moduleConfig[module].iconMap[key] || FileCode2;
  }, [module, folderLabel]);

  const folderLink = useMemo(() => {
    const getLinkByContentPath = (content: ContentType) =>
      `/${lang}/${module}/${content.path.split('/').slice(2).join('/')}`;

    if (!item.children) {
      return getLinkByContentPath(item);
    }
    if (item.children.some(item => item.name.startsWith('index'))) {
      return getLinkByContentPath(item.children.find(item => item.name.startsWith('index'))!);
    }
    return;
  }, [lang, module, item]);

  const showExpand = useMemo(
    () => (folderLink ? item.children && item.children.length > 1 : item.children),
    [item.children, folderLink],
  );

  const handleChevronClick = (event: React.MouseEvent) => {
    setOpen(!open);
    event.stopPropagation(); // 阻止事件冒泡
  };

  const getContentLink = (content: ContentType) => {
    return content.name.startsWith('index')
      ? undefined
      : `/${lang}/${module}/${content.path.split('/').slice(2).join('/')}`;
  };

  const getContentLabel = (name: string) => (name.split('_')[1] || name.split('_')[0]).split('.')[0];

  return (
    <Collapsible key={item.sha} open={open} asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="capitalize" onClick={() => folderLink && navigate(folderLink)}>
            {FolderIcon ? <FolderIcon /> : null}
            <span>{folderLabel}</span>
            {item.type === 'dir' && showExpand ? (
              <ChevronRight
                className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                onClick={handleChevronClick}
              />
            ) : null}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {item.children ? (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children!.map(subItem => {
                const fileLink = getContentLink(subItem);
                return fileLink ? (
                  <SidebarMenuSubItem key={subItem.sha}>
                    <SidebarMenuSubButton asChild>
                      <Link to={fileLink}>
                        <span>{getContentLabel(subItem.name)}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : null;
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  );
};

export default MenuItem;
