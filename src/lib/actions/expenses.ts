'use server';

import connectDB from '@/lib/mongodb';
import { Expense } from '@/models';
import { revalidatePath } from 'next/cache';
import { escapeRegex } from '@/lib/utils';
import { requireAdmin, requireManagerOrAdmin } from '@/lib/security';

export async function getExpenses(filters?: {
  category?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  // Security check: exposes expense amounts/categories - matches view_expenses (manager/admin only)
  await requireManagerOrAdmin();
  await connectDB();

  const query: any = {};

  if (filters?.category) {
    query.category = filters.category;
  }

  if (filters?.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { description: { $regex: safeSearch, $options: 'i' } },
      { category: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    query.date = {};
    if (filters.startDate) {
      query.date.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.date.$lte = filters.endDate;
    }
  }

  const expenses = await Expense.find(query)
    .populate('createdBy', 'name')
    .sort({ date: -1 });

  return JSON.parse(JSON.stringify(expenses));
}

export async function getExpenseById(id: string) {
  await requireManagerOrAdmin();
  await connectDB();

  const expense = await Expense.findById(id).populate('createdBy', 'name');

  return JSON.parse(JSON.stringify(expense));
}

export async function createExpense(data: any) {
  // Security check: Only admins can manage expenses
  await requireAdmin();

  await connectDB();

  const expense = await Expense.create(data);

  revalidatePath('/dashboard/expenses');
  return JSON.parse(JSON.stringify(expense));
}

export async function updateExpense(id: string, data: any) {
  // Security check: Only admins can manage expenses
  await requireAdmin();

  await connectDB();

  const expense = await Expense.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true }
  );

  revalidatePath('/dashboard/expenses');
  return JSON.parse(JSON.stringify(expense));
}

export async function deleteExpense(id: string) {
  // Security check: Only admins can manage expenses
  await requireAdmin();

  await connectDB();

  await Expense.findByIdAndDelete(id);

  revalidatePath('/dashboard/expenses');
  return { success: true };
}

export async function getExpenseSummary(startDate: Date, endDate: Date) {
  await requireManagerOrAdmin();
  await connectDB();

  const expenses = await Expense.find({
    date: { $gte: startDate, $lte: endDate },
  });

  const summary = expenses.reduce((acc: any, expense: any) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    acc[expense.category] += expense.amount;
    return acc;
  }, {});

  return {
    total: expenses.reduce((sum: number, e: any) => sum + e.amount, 0),
    byCategory: summary,
  };
}
