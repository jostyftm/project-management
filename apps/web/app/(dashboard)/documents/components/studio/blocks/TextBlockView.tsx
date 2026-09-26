"use client";

import React, { useState } from "react";
import { TextBlock } from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { Button } from "@/components/ui/button";

interface TextBlockViewProps {
  block: TextBlock;
  isSelected: boolean;
  isPreview: boolean;
}

export const TextBlockView: React.FC<TextBlockViewProps> = ({
  block,
  isSelected,
  isPreview,
}) => {
  const updateBlock = useDocStudioStore((state) => state.updateBlock);
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(block.content);

  const styles = block.styles || {};

  const handleSaveText = () => {
    updateBlock(block.id, { content: tempContent });
    setIsEditing(false);
  };

  const textStyle: React.CSSProperties = {
    fontWeight: styles.bold ? "bold" : "normal",
    fontStyle: styles.italic ? "italic" : "normal",
    textDecoration: styles.underline ? "underline" : "none",
    textAlign: styles.align || "left",
    color: styles.color || "#1e293b",
    fontSize: styles.fontSize ? `${styles.fontSize}pt` : undefined,
  };

  const renderContent = () => {
    if (isEditing && !isPreview) {
      return (
        <div className="space-y-2 mt-1">
          <textarea
            className="w-full p-2 text-sm border rounded-md font-inherit focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-y min-h-[80px]"
            value={tempContent}
            onChange={(e) => setTempContent(e.target.value)}
            onBlur={handleSaveText}
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleSaveText}>
              Listo
            </Button>
          </div>
        </div>
      );
    }

    const contentText = block.content || "(Texto vacío - Haz clic para editar)";

    switch (block.tag) {
      case "h1":
        return (
          <h1
            style={textStyle}
            className="text-3xl font-extrabold tracking-tight text-slate-900 cursor-pointer"
            onClick={() => !isPreview && setIsEditing(true)}
          >
            {contentText}
          </h1>
        );
      case "h2":
        return (
          <h2
            style={textStyle}
            className="text-2xl font-bold tracking-tight text-slate-800 cursor-pointer"
            onClick={() => !isPreview && setIsEditing(true)}
          >
            {contentText}
          </h2>
        );
      case "h3":
        return (
          <h3
            style={textStyle}
            className="text-xl font-semibold tracking-tight text-slate-700 cursor-pointer"
            onClick={() => !isPreview && setIsEditing(true)}
          >
            {contentText}
          </h3>
        );
      case "h4":
        return (
          <h4
            style={textStyle}
            className="text-base font-semibold tracking-tight text-slate-600 cursor-pointer"
            onClick={() => !isPreview && setIsEditing(true)}
          >
            {contentText}
          </h4>
        );
      case "quote":
        return (
          <blockquote
            style={textStyle}
            className="border-l-4 border-blue-500 pl-4 py-1 italic bg-slate-50 text-slate-600 rounded-r cursor-pointer my-2"
            onClick={() => !isPreview && setIsEditing(true)}
          >
            {contentText}
          </blockquote>
        );
      case "p":
      default:
        return (
          <p
            style={textStyle}
            className="text-sm leading-relaxed text-slate-800 whitespace-pre-line cursor-pointer"
            onClick={() => !isPreview && setIsEditing(true)}
          >
            {contentText}
          </p>
        );
    }
  };

  return (
    <div className="relative group/text">
      {renderContent()}
    </div>
  );
};
