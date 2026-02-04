import { prisma } from '../application/database';
import { CategoryResponse, toCategoryResponse } from '../model/category-model';

export class CategoryService {
  static async listCategories(): Promise<CategoryResponse[]> {
    const categories = await prisma.category.findMany({
      orderBy: { label: 'asc' },
    });

    return categories.map((c) => toCategoryResponse(c));
  }
}
