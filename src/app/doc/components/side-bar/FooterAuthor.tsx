import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Typography } from '@/components/ui/typography';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { ChevronsUpDown } from 'lucide-react';
import { FC, useRef, useState } from 'react';
import { BiStar } from 'react-icons/bi';
import { CgNpm } from 'react-icons/cg';
import { RiGithubLine, RiWechat2Line } from 'react-icons/ri';
import SponsorDialog from '../../../../components/shared/SponsorDialog';
import { useTranslation } from 'react-i18next';
import useLang from '@/hooks/useLang';
import WeixinDialog from '@/components/shared/WeixinDialog';

const FooterAuthor: FC = () => {
  const { lang } = useLang();
  const { isMobile } = useSidebar();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const dialogOpenRef = useRef<boolean>(false);

  const handleDialogOpenChange = (open: boolean) => {
    dialogOpenRef.current = open;
    if (!open) setOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open || !dialogOpenRef.current) setOpen(open);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={
                    lang === 'en'
                      ? 'https://github.com/pionpill.png'
                      : 'https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100'
                  }
                />
                <AvatarFallback>{lang === 'en' ? 'PP' : '小葱'}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <Typography className="font-semibold">{lang === 'en' ? 'pionpill' : '小葱拌豆腐'}</Typography>
                <Typography className="text-xs">673486387@qq.com</Typography>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            side={isMobile ? 'bottom' : 'right'}
          >
            <SidebarMenuButton
              className="flex items-center gap-2 font-normal h-12"
              onClick={() => window.open('https://pionpill.github.io/', '_blank')}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src="https://github.com/pionpill.png" />
                <AvatarFallback>PP</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <Typography className="font-semibold">{t('doc.blog')}</Typography>
                <Typography className="text-xs">pionpill.github.io</Typography>
              </div>
            </SidebarMenuButton>
            <DropdownMenuSeparator />
            <WeixinDialog
              onOpenChange={handleDialogOpenChange}
              trigger={
                <DropdownMenuItem>
                  <RiWechat2Line />
                  <Typography className="text-sm">{t('common.contactOnWechat')}</Typography>
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem>
              <RiGithubLine />
              <Typography className="text-sm" onClick={() => window.open('https://github.com/Pionpill', '_blank')}>
                {t('doc.followAuthor')}
              </Typography>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CgNpm />
              <Typography
                className="text-sm"
                onClick={() => window.open('https://www.npmjs.com/package/@retikz/core', '_blank')}
              >
                {t('doc.seeOnNpm')}
              </Typography>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BiStar />
              <Typography
                className="text-sm"
                onClick={() => window.open('https://github.com/Pionpill/retikz', '_blank')}
              >
                {t('doc.starRetikZ')}
              </Typography>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SponsorDialog onOpenChange={handleDialogOpenChange} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default FooterAuthor;
