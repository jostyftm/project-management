"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import BaseIcon from "./base-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";
import useGetApplicationById from "@/hooks/application/use-application-by-id";
import useListApplication from "@/hooks/application/use-list-application";
import { useIsMobile } from "@/hooks/use-mobile";
import { APPLICATION_STORAGE_KEY, LOGIN_ROUTE, ACCESS_TOKEN } from "@/config/constants";
import { storage } from "@/lib/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function TeamSwitcher() {
  const appId = storage.get(APPLICATION_STORAGE_KEY) as string;
  const token = storage.get(ACCESS_TOKEN) as string;
  const { application, isLoading } = useGetApplicationById();
  const { applications, isLoading: isLoadingApplications } = useListApplication({});
  const isMobile = useIsMobile();

  const router = useRouter();


  if (isLoading || !application || isLoadingApplications) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Skeleton className="flex aspect-square size-8 rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
            <Skeleton className="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">

                <span className="font-bold uppercase">
                  {" "}
                  {getInitials(application?.attributes.name)}
                </span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {application?.attributes.name}
                </span>
                <span className="truncate text-xs">{ }</span>
              </div>
              <BaseIcon name="ChevronsUpDown" className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Aplicaciones
            </DropdownMenuLabel>
            {applications?.map((team) => (
              <DropdownMenuItem
                key={team.attributes.name}
                className="gap-2 p-2 cursor-pointer"
                hidden={team.id === Number(appId)}
                asChild
              >
                <Link href={`${team.attributes.url}/login?token=${token}&app=${team.id}`}>
                  <div className="flex size-8 items-center justify-center rounded-sm border">
                    {
                      team.attributes.avatar ? (
                        <img
                          src={team.attributes.avatar}
                          alt={team.attributes.name}
                          className="size-4 rounded-sm"
                        />
                      ) : (
                        <div className="flex size-8 font-semibold text-xs items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                          {getInitials(team.attributes.name)}
                        </div>
                      )
                    }
                  </div>
                  <span>{team.attributes.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 cursor-pointer"
              asChild
            >
              <Link href={LOGIN_ROUTE}>
                <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                  <BaseIcon name='LayoutGrid' className='size-4' />
                </div>
                <span>Todas las aplicaciones</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
