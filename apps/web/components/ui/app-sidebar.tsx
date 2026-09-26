"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

import useSidebar from "@/hooks/useSidebar";
import BaseIcon, { IconName } from "./base-icon";
import { TeamSwitcher } from "./team-switcher";
import { NavUser } from "./nav-user";
import PinnedItems from "./PinnedItems";
import { SidebarItemType } from "@/types/sidebar/sidebar-item";

const getChildren = (node: SidebarItemType): SidebarItemType[] => {
  if (
    Array.isArray(node.relationships?.childrens) &&
    node.relationships.childrens.length > 0
  ) {
    return node.relationships.childrens;
  }
  if (Array.isArray(node.childrens) && node.childrens.length > 0) {
    return node.childrens;
  }
  return [];
};

const isNodeOrDescendantActive = (
  node: SidebarItemType,
  pathname: string,
): boolean => {
  if (
    node.attributes.path &&
    (pathname === node.attributes.path ||
      (node.attributes.path !== "/" &&
        pathname.startsWith(`${node.attributes.path}/`)))
  ) {
    return true;
  }
  const children = getChildren(node);
  return children.some((child) => isNodeOrDescendantActive(child, pathname));
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isLoading, items } = useSidebar();
  const pathname = usePathname();

  const renderSidebarItem = (node: SidebarItemType) => {
    const children = getChildren(node);
    const hasDistinctChildren =
      children.length > 1 ||
      (children.length === 1 &&
        children[0].attributes.path !== node.attributes.path);

    if (hasDistinctChildren) {
      const isOpen = isNodeOrDescendantActive(node, pathname);
      const isParentActive = isOpen;

      return (
        <Collapsible
          key={node.id}
          asChild
          defaultOpen={isOpen}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={node.attributes.name}
                className={cn(
                  "transition-colors",
                  isParentActive &&
                    "bg-sidebar-item-active text-accent-foreground font-semibold",
                )}
              >
                {node.attributes.icon && (
                  <BaseIcon name={node.attributes.icon as IconName} />
                )}
                <span className="flex-1 text-left first-letter:uppercase">
                  {node.attributes.name}
                </span>
                <BaseIcon
                  name="ChevronRight"
                  size={14}
                  className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {children.map((subItem) => {
                  const isSubActive =
                    pathname === subItem.attributes.path ||
                    (subItem.attributes.path !== "/" &&
                      pathname.startsWith(`${subItem.attributes.path}/`));

                  return (
                    <SidebarMenuSubItem key={subItem.id}>
                      <SidebarMenuSubButton asChild isActive={isSubActive}>
                        <Link
                          href={subItem.attributes.path}
                          className="flex items-center gap-2"
                        >
                          {subItem.attributes.icon && (
                            <BaseIcon
                              name={subItem.attributes.icon as IconName}
                              size={14}
                            />
                          )}
                          <span className="first-letter:uppercase">
                            {subItem.attributes.name}
                          </span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    const isActive =
      pathname === node.attributes.path ||
      (node.attributes.path !== "/" &&
        pathname.startsWith(`${node.attributes.path}/`));

    return (
      <SidebarMenuItem key={node.id}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={node.attributes.name}
          className={cn(
            "transition-colors",
            isActive &&
              "bg-sidebar-item-active text-accent-foreground font-semibold",
          )}
        >
          <Link
            href={node.attributes.path}
            className="flex items-center gap-2 w-full"
          >
            {node.attributes.icon && (
              <BaseIcon name={node.attributes.icon as IconName} />
            )}
            <span className="first-letter:uppercase">
              {node.attributes.name}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarGroup>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <SidebarMenuSkeleton key={i} showIcon />
              ))}
            </div>
          ) : (
            <SidebarMenu>
              {items.map((item) => renderSidebarItem(item))}
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <PinnedItems />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
