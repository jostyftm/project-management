export enum ModalsNameCategory {
  createCategory = "createCategory",
  updateCategory = "updateCategory",
  deleteCategory = "deleteCategory",
}

export const ModalsTitleCategory: Record<ModalsNameCategory, string> = {
  [ModalsNameCategory.createCategory]: "Crear categoría",
  [ModalsNameCategory.updateCategory]: "Actualizar categoría",
  [ModalsNameCategory.deleteCategory]: "",
};