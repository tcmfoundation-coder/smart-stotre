'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Layers, Search, Plus, Edit, Trash2, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useCategories, useDeleteCategory, type Category } from '@/hooks/useCategories';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CategoryForm } from '@/components/dialogs/CategoryForm';

const categoryIcons: Record<string, string> = {
  Beverages: '🥤',
  Food: '🍝',
  Bakery: '🥖',
  Dairy: '🥛',
  Snacks: '🍪',
  Household: '🧹',
  default: '📦',
};

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const { data: categories, isLoading, error, refetch } = useCategories({ search: searchQuery });
  const deleteCategory = useDeleteCategory();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteCategory.mutate(id);
    }
  };

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Product Categories" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button className="w-full gap-2 sm:w-auto" onClick={handleAddCategory}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load categories" onRetry={() => refetch()} />
          ) : !categories || categories.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No categories found"
              description={searchQuery ? 'Try a different search term' : 'Add your first category to get started'}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category: any) => (
                <Card key={category._id}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                          {categoryIcons[category.name] || categoryIcons.default}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{category.name}</h3>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{category.productCount} products</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(category._id)}
                        disabled={deleteCategory.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ErrorBoundary>

        <CategoryForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          mode={formMode}
          category={selectedCategory}
          onSuccess={() => refetch()}
        />
      </main>
    </div>
  );
}
