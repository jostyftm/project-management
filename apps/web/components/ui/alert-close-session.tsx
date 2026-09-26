import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import BaseIcon from "./base-icon";
import { useAuth } from "@/hooks/use-auth";

export function AlertCloseSesion() {
  const { logout, isLoading } = useAuth();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild className="cursor-pointer">
        <p className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
          <LogOut />
          Cerrar sesión
        </p>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Estas seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Da clic en continuar para cerrar esta sesión
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={false} onClick={logout}>
            {isLoading ? (
              <BaseIcon name="Loader" className="animate-spin" />
            ) : (
              "Cerrar sesión"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
