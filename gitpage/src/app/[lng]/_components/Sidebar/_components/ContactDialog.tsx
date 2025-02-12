'use client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Typography } from '@/components/ui/typography';
import useClientTrans from '@/hooks/useClientTrans';
import { useThemeSelector } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { Files } from 'lucide-react';
import { FC } from 'react';
import { BsWechat } from 'react-icons/bs';
import { RiWechat2Line } from 'react-icons/ri';
import QRCode from 'react-qr-code';

const ContactDialog: FC = () => {
  const { t } = useClientTrans();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText('wxid_ako3myhp30ye22').then(() => {
      toast({
        description: t('copySuccess'),
      });
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem>
          <RiWechat2Line />
          <Typography className="text-sm">{t('contactAuthor')}</Typography>
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="w-96">
        <DialogHeader>
          <div className="items-center flex gap-2">
            <BsWechat className="text-green-600" />
            <DialogTitle>微信</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2">
          <img src="https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100" className="size-32 rounded-full" />
          <Typography className="font-bold text-lg">小葱拌豆腐</Typography>
          <div className="flex items-center gap-1">
            <Typography>wxid_ako3myhp30ye22</Typography>
            <Button variant="ghost" icon onClick={handleCopy}>
              <Files className="opacity-60" />
            </Button>
          </div>
          <QRCode
            value="https://qm.qq.com/cgi-bin/qm/qr?k=8XRx97ISM1ZGoJBXA7rgYjQYjZz-Twv6&noverify=0&personal_qrcode_source=4"
            bgColor={useThemeSelector('#fff', '#000')}
            fgColor={useThemeSelector('#000', '#fff')}
          />
          <Typography variant="hint">{t('indicatePurpose')}</Typography>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
