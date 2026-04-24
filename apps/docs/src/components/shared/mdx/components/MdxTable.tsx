import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FC, ReactNode, useMemo } from "react";

export type MdxTableProps = {
  header: Array<string | {title: string, key?: string}>;
  data: Array<Record<string, string>>;
  caption?: ReactNode;
};

const MdxTable: FC<MdxTableProps> = (props) => {
  const { header, data, caption } = props;
  const formatHeader = useMemo(() => {
    return header.map((h) => {
      if (typeof h === 'string') {
        return { title: h, key: h };
      }
      return { key: h.key || h.title, ...h } as { title: string, key: string };
    });
  }, [header]);

  return (
    <Table className="mt-5">
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          {formatHeader.map((h, index) => (
            <TableHead className={cn("font-bold", { "border-l": index !== 0})} key={h.key}>{h.title}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={index}>
            {formatHeader.map((h, index) => (
              <TableCell className={cn({ "border-l": index !== 0})} key={h.key + row[h.key]}>{row[h.key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default MdxTable;
