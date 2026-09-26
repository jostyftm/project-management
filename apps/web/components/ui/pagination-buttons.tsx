import { MetaPaginateType } from "@/types/paginate";

import { cn } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination";

const PaginationButtons = ({
  meta,
  onPressPage,
  disabled,
}: {
  meta?: Partial<MetaPaginateType>;
  onPressPage?: (value: number) => void;
  disabled?: boolean;
}) => {
  if (!meta) return null;

  const getPageFromUrl = (url: string) => {
    const page = new URLSearchParams(new URL(url).search).get("page");
    return page ? Number(page) : null;
  };

  const handleClick = (url?: string) => {
    if (!url || disabled) return;
    const page = getPageFromUrl(url);
    if (page !== null) {
      onPressPage?.(page);
    }
  };

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        {meta.links?.map((link, index, arr) => (
          <PaginationItemButton
            key={index}
            link={link}
            isFirst={index === 0}
            isLast={index === arr.length - 1}
            onClick={handleClick}
          />
        ))}
      </PaginationContent>
    </Pagination>
  );
};

const PaginationItemButton = ({
  link,
  isFirst,
  isLast,
  onClick,
}: {
  link: { url: string | null; label: string; active: boolean };
  isFirst: boolean;
  isLast: boolean;
  onClick: (url?: string) => void;
}) => {
  const commonProps = {
    className: "cursor-pointer",
    isActive: link.active,
    onClick: () => link.url && onClick(link.url),
  };

  if (isFirst) {
    return (
      <PaginationItem>
        <PaginationPrevious {...commonProps} />
      </PaginationItem>
    );
  }

  if (isLast) {
    return (
      <PaginationItem>
        <PaginationNext {...commonProps} />
      </PaginationItem>
    );
  }

  return (
    <PaginationItem className="hidden lg:block">
      <PaginationLink
        className={cn(
          "cursor-pointer",
          link.active &&
            "bg-primary/80 hover:bg-primary/100 transition-colors hover:text-white text-white"
        )}
        isActive={link.active}
        onClick={() => link.url && onClick(link.url)}
      >
        {link.label}
      </PaginationLink>
    </PaginationItem>
  );
};

export default PaginationButtons;
