"use client";

import React from "react";
import { DividerBlock } from "@/types/document-type";

export const DividerBlockView: React.FC<{ block: DividerBlock }> = () => {
  return (
    <div className="py-2">
      <hr className="border-t border-slate-300" />
    </div>
  );
};
