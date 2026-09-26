import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useErrorHandler from "@/hooks/use-form-error-handler";
import usePermissionsByModule from "@/hooks/permission-guard/use-perminissions-by-module";

interface Props {
  readonly children: React.ReactNode;
}

export function PermissionProvider({ children }: Props) {
  const pathname = usePathname();
  const { syncPermission } = usePermissionsByModule();
  const { errorhandler } = useErrorHandler();

  useEffect(() => {
    const updatePermissions = async () => {
      try {
        await syncPermission(pathname);
      } catch (error) {
        errorhandler(error);
      }
    };

    updatePermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return <>{children}</>;
}
