"use client";
import React from "react";
import { ReportCategory } from "@/types/report-category-type";
import CategoryTreeNodeView from "./CategoryTreeNode";

interface Props {
  categories: ReportCategory[];
}

const CategoryTree = ({ categories }: Props) => {
  return (
    <div className="flex flex-col gap-0.5">
      {categories.map((category) => (
        <CategoryTreeNodeView key={category.id} category={category} depth={0} />
      ))}
    </div>
  );
};

export default CategoryTree;