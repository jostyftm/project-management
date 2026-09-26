"use client";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./sidebar";
import Link from "next/link";
import BaseIcon from "./base-icon";
import { APP_DOC_URL } from "@/config/enviroments";

const PinnedItems = () => {
    return (
        <SidebarGroup>
            <SidebarMenu>

                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link
                            href={APP_DOC_URL}
                            target="_blank"
                        >
                            <BaseIcon name={"LifeBuoy"} />
                            <span>Ayuda</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
};

export default PinnedItems;