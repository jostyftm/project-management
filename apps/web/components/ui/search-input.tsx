import React, { useEffect, useState } from "react";
import { Input } from "./input";

import BaseIcon from "./base-icon";
import useDebounce from "@/hooks/use-debounce";

interface Props {
  placeholder?: string;
  debouncedDelay?: number;
  onChangeDebounced?: (value: string) => void;
  onChageValue?: (value: string) => void;
  value?: string;
}

const SearchInput = ({
  debouncedDelay = 500,
  placeholder,
  onChageValue,
  onChangeDebounced,
  value: v = "",
}: Props) => {
  const [inputValue, setInputValue] = useState(v);
  const debouncedValue = useDebounce(inputValue, debouncedDelay);

  useEffect(() => {
    if (onChangeDebounced) onChangeDebounced?.(debouncedValue);
  }, [debouncedValue, onChangeDebounced]);

  const handleChangeValue = (value: string) => {
    onChageValue?.(value);
    setInputValue(value);
  };

  return (
    <div className="relative lg:w-56 w-full h-auto">
      <Input
        className=" pr-8"
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={({ target }) => handleChangeValue(target.value)}
      />
      <BaseIcon
        name="Search"
        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={15}
      />
    </div>
  );
};

export default SearchInput;
