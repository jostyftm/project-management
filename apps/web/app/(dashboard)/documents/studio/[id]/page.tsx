"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { DocStudio } from "../../components/studio/DocStudio";
import { useDocumentById } from "../../hooks/use-documents";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { Loader2 } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

export default function EditDocumentStudioPage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : undefined;

  const { data: document, isLoading } = useDocumentById(id);
  const loadDocument = useDocStudioStore((state) => state.loadDocument);

  useEffect(() => {
    if (document) {
      loadDocument(document);
    }
  }, [document, loadDocument]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Cargando estudio del documento...
        </span>
      </div>
    );
  }

  return (
    <PermissionGuard action="update" unauthorizedComponent={<Unauthorized />}>
      <DocStudio />
    </PermissionGuard>
  );
}
