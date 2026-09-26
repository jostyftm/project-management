import { useEffect } from "react";

interface UseResetPageOnEmptyProps {
  data: unknown[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const useResetPageOnEmpty = ({
  data,
  currentPage,
  onPageChange,
}: UseResetPageOnEmptyProps) => {
  useEffect(() => {
    if (data.length === 0 && currentPage !== 1) {
      onPageChange(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, currentPage]);
};
