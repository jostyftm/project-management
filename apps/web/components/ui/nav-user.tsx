"use client";

import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import AvatarEmployee from "./avatar-employee";
import { AlertCloseSesion } from "./alert-close-session";

import { useAuth } from "@/hooks/use-auth";

const AvatarUser = ({
  avatar,
  username,
}: {
  avatar: string | undefined;
  username: string | undefined;
}) => {
  return (
    <AvatarEmployee
      className="h-8 w-8"
      fallbackClassName="text-xs"
      name={username ?? ""}
      img={avatar}
    />
  );
};

export function NavUser() {
  const { isMobile } = useSidebar();
  const { user } = useAuth();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <AvatarUser
                avatar={user?.attributes?.avatar}
                username={user?.attributes?.name}
              />

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user?.attributes?.username}
                </span>
                <span className="truncate text-xs">
                  {user?.attributes?.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <AvatarUser
                  avatar={user?.attributes?.avatar}
                  username={user?.attributes?.name}
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user?.attributes?.name}
                  </span>
                  <span className="truncate text-xs">
                    {user?.attributes?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            {/* <DropdownMenuSeparator />
            <DropdownMenuGroup className='flex '></DropdownMenuGroup> */}
            <DropdownMenuSeparator />
            <div>
              <AlertCloseSesion />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
