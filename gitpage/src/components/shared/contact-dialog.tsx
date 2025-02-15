'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Typography } from '@/components/ui/typography';
import { useThemeSelector } from '@/hooks/useTheme';
import { FC, ReactElement } from 'react';
import QRCode from 'react-qr-code';

export type ContactDialogProps = {
  icon: ReactElement;
  label: string;
  description?: string;
  imgUrl: string;
  title: string;
  content?: ReactElement;
  qrCodeUrl: string;
  bottomContent?: string;
  trigger: ReactElement;
};

const ContactDialog: FC<ContactDialogProps> = props => {
  const { icon, label, description, imgUrl, title, content, qrCodeUrl, bottomContent, trigger } = props;

  return (
    <Dialog>
      <DropdownMenu>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      </DropdownMenu>
      <DialogContent className="w-96">
        <DialogHeader>
          <div className="items-center flex gap-2">
            {icon}
            <DialogTitle className="capitalize">{label}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2">
          <img src={imgUrl} className="size-32 rounded-full" />
          <Typography className="font-bold text-lg uppercase">{title}</Typography>
          <div className="flex items-center gap-1 capitalize">{content}</div>
          <QRCode
            value={qrCodeUrl}
            bgColor={useThemeSelector('#fff', '#000')}
            fgColor={useThemeSelector('#000', '#fff')}
          />
          {bottomContent ? <Typography variant="hint">{bottomContent}</Typography> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
