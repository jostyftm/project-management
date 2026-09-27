"use client";

import React, { useState } from "react";
import { Release } from "@/types/plane-types";
import { releaseService } from "@/services/plane/releaseService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Sparkles, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReleasePublishModalProps {
  release: Release | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: (updated: Release) => void;
}

export function ReleasePublishModal({
  release,
  open,
  onOpenChange,
  onPublished,
}: ReleasePublishModalProps) {
  const [changelog, setChangelog] = useState<string>(release?.changelog || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  React.useEffect(() => {
    if (release) {
      setChangelog(release.changelog || "");
    }
  }, [release]);

  if (!release) return null;

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await releaseService.generateChangelog(release.id);
      setChangelog(generated);
      toast.success("Changelog categorizado regenerado");
    } catch (err) {
      toast.error("Error al regenerar el changelog");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // Update changelog if edited, then publish
      await releaseService.update(release.id, { changelog });
      const published = await releaseService.publish(release.id);
      toast.success(`Versión ${published.version} publicada exitosamente`);
      onPublished(published);
      onOpenChange(false);
    } catch (err) {
      toast.error("Error al publicar la versión");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Rocket className="size-5 text-indigo-600" />
            Publicar Release: {release.version} ({release.name})
          </DialogTitle>
          <DialogDescription>
            Revisa las notas de la versión categorizadas automáticamente a partir de los work items completados antes de publicar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Changelog en Markdown:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="h-7 text-xs gap-1"
            >
              <RefreshCw className={cn("size-3", isGenerating && "animate-spin")} />
              <span>Regenerar Automáticamente</span>
            </Button>
          </div>

          <Textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={12}
            placeholder="# Notas de la versión..."
            className="font-mono text-xs leading-relaxed bg-slate-50 border-slate-200"
          />
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
          >
            {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            <span>Publicar Versión Oficial</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
