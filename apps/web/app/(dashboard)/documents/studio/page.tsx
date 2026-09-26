"use client";

import React, { useEffect } from "react";
import { DocStudio } from "../components/studio/DocStudio";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

export default function NewDocumentStudioPage() {
  const reset = useDocStudioStore((state) => state.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <PermissionGuard action="create" unauthorizedComponent={<Unauthorized />}>
      <DocStudio />
    </PermissionGuard>
  );
}
