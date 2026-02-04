import { Category } from '../generated/prisma/client';

export type CategoryResponse = {
  id: string;
  value: string;
  label: string;
  icon: string;
};

export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    value: category.value,
    label: category.label,
    icon: category.icon,
  };
}
