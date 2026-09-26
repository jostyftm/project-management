import { ReportCategory } from "@/types/report-category-type";

/**
 * Devuelve los IDs de una categoría y de todos sus descendientes (transitivo)
 * a partir de la lista plana de categorías.
 *
 * Útil para excluirse a sí misma y a sus hijos al elegir una nueva categoría
 * padre y así evitar ciclos.
 */
export const collectSubtreeIds = (
  categories: ReportCategory[],
  rootId: number
): Set<number> => {
  const childrenOf = new Map<number, number[]>();
  categories.forEach((category) => {
    const parentId = category.relationships.parent_id;
    if (parentId != null && parentId !== category.id) {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(category.id);
      childrenOf.set(parentId, siblings);
    }
  });

  const ids = new Set<number>();
  const stack = [rootId];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    (childrenOf.get(id) ?? []).forEach((child) => stack.push(child));
  }

  return ids;
};