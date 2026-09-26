import React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react/dist/iconify.js";

type Theme = "green" | "red" | "blue" | "gray";

interface Props {
  icon: string;
  theme: Theme;
  iconSize?: number;
  className?: string;
}

const themeClasses: Record<Theme, { bg: string; text: string }> = {
  green: { bg: "bg-green-100", text: "text-green-400" },
  red: { bg: "bg-red-100", text: "text-red-400" },
  blue: { bg: "bg-blue-100", text: "text-blue-400" },
  gray: { bg: "bg-gray-200", text: "text-gray-700" },
};

const BubbleIcon = ({ icon, theme, iconSize, className }: Props) => {
  const { bg, text } = themeClasses[theme];

  return (
    <div className={cn("p-4 rounded-full w-min", bg, className)}>
      <Icon icon={icon} className={cn("", text)} fontSize={iconSize} />
    </div>
  );
};

export default BubbleIcon;
