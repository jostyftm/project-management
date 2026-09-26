import * as icons from "lucide-react";

// Tipo para los nombres de los iconos
type IconName = keyof typeof icons;

export type SidebarItemType = {
    id: number;
    type: string;
    attributes: {
        id?: number;
        name: string;
        path: string;
        description?: string | null;
        icon: IconName | string;
        parent: number | null;
        order?: number;
    };
    relationships?: {
        childrens?: SidebarItemType[] | null;
    };
    childrens?: SidebarItemType[] | null;
};