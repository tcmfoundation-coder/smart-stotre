import { redirect } from 'next/navigation';

// dashboard/categories is the canonical category-management page (search,
// description field, and the standard useCategories hook / /api/categories
// route used everywhere else in the app). This route existed as a second,
// less complete implementation of the same CRUD - redirect instead of
// maintaining duplicated logic.
export default function InventoryCategoriesRedirect() {
  redirect('/dashboard/categories');
}
