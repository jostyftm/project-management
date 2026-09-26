import * as icons from "lucide-react";

type IconName = keyof typeof icons;

export type moduleType = {
  name: string;
  path: string;
  description?: string | null;
  icon: IconName;
  // isActive?: boolean;
  // isSelected: boolean;
  parent: number | null;
  childrens: moduleType[] | null;
};

export type mobileSidebarType = {
  className?: string;
};

export type desktopSidebarType = {
  className?: string;
};
