import './load-env';
import connectDB from './mongodb';
import bcrypt from 'bcryptjs';
import { User, Category, Product, Customer, Supplier, Expense, Employee, Branch, Notification, Sale, Loyalty, Transaction } from '@/models';
import { generateCustomerId, generateTransactionId, generateSKU, generateBarcode } from './utils';

// Helper function to generate random date within range
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random integer
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedDatabase() {
  // This wipes every collection below before reseeding demo data - a
  // one-line accident (running `npm run seed` against a production
  // MONGODB_URI, e.g. from a Railway shell) would destroy real production
  // data with no prompt and no undo. Refuse unless explicitly overridden.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error(
      'Refusing to run seedDatabase() with NODE_ENV=production: this deletes all data in every ' +
      'collection. If you really intend to seed a production database, set ALLOW_PRODUCTION_SEED=true.'
    );
  }

  await connectDB();

  console.log('🌱 Starting comprehensive database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await User.deleteMany({});
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Customer.deleteMany({});
  await Supplier.deleteMany({});
  await Expense.deleteMany({});
  await Employee.deleteMany({});
  await Branch.deleteMany({});
  await Notification.deleteMany({});
  await Sale.deleteMany({});
  await Loyalty.deleteMany({});
  await Transaction.deleteMany({});

  console.log('✅ Cleared existing data');

  // Create Branch
  console.log('🏢 Creating branch...');
  const branch = await Branch.create({
    name: 'Main Store',
    code: 'MAIN',
    address: '123 Main Street, City',
    phone: '+1 234 567 8900',
    email: 'main@smartmart.com',
    managerId: undefined,
    isActive: true,
    settings: {
      currency: 'USD',
      taxRate: 0,
      lowStockThreshold: 10,
      expiryWarningDays: 15,
    },
  });
  console.log('✅ Created branch');

  // Create Users
  console.log('👥 Creating users...');
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@smartmart.com',
    password: 'admin123',
    role: 'admin',
    phone: '+1 234 567 8901',
    branchId: branch._id,
    isActive: true,
  });

  const managerUser = await User.create({
    name: 'Manager User',
    email: 'manager@smartmart.com',
    password: 'manager123',
    role: 'manager',
    phone: '+1 234 567 8902',
    branchId: branch._id,
    isActive: true,
  });

  const cashiers = await User.create([
    {
      name: 'Cashier Sarah',
      email: 'sarah@smartmart.com',
      password: 'cashier123',
      role: 'cashier',
      phone: '+1 234 567 8903',
      branchId: branch._id,
      isActive: true,
    },
    {
      name: 'Cashier Mike',
      email: 'mike@smartmart.com',
      password: 'cashier123',
      role: 'cashier',
      phone: '+1 234 567 8904',
      branchId: branch._id,
      isActive: true,
    },
    {
      name: 'Cashier Emma',
      email: 'emma@smartmart.com',
      password: 'cashier123',
      role: 'cashier',
      phone: '+1 234 567 8905',
      branchId: branch._id,
      isActive: true,
    },
  ]);

  // Update branch manager
  await Branch.findByIdAndUpdate(branch._id, { managerId: adminUser._id });
  console.log('✅ Created 5 users (1 admin, 1 manager, 3 cashiers)');

  // Create Categories
  console.log('📦 Creating categories...');
  const categories = await Category.create([
    { name: 'Groceries', description: 'Food items and groceries', isActive: true },
    { name: 'Beverages', description: 'All types of drinks', isActive: true },
    { name: 'Snacks', description: 'Chips, cookies, and snacks', isActive: true },
    { name: 'Frozen Foods', description: 'Frozen meals and items', isActive: true },
    { name: 'Meat & Chicken', description: 'Fresh and frozen meat products', isActive: true },
    { name: 'Vegetables', description: 'Fresh vegetables', isActive: true },
    { name: 'Fruits', description: 'Fresh fruits', isActive: true },
    { name: 'Household Items', description: 'Cleaning and household items', isActive: true },
    { name: 'Personal Care', description: 'Personal hygiene products', isActive: true },
    { name: 'Electronics/Accessories', description: 'Electronics and accessories', isActive: true },
  ]);
  console.log(`✅ Created ${categories.length} categories`);

  // Create Suppliers
  console.log('🏭 Creating suppliers...');
  const suppliers = await Supplier.create([
    {
      name: 'Food Corp',
      company: 'Food Corporation Ltd',
      email: 'orders@foodcorp.com',
      phone: '+1 234 567 8906',
      address: '321 Industrial Park',
      productsSupplied: [],
      totalPurchases: 50000,
      outstandingDebt: 5000,
      paymentTerms: 'Net 30',
      notes: 'Primary supplier for groceries',
      isActive: true,
    },
    {
      name: 'Dairy Farms',
      company: 'Fresh Dairy Farms',
      email: 'supply@dairyfarms.com',
      phone: '+1 234 567 8907',
      address: '654 Farm Road',
      productsSupplied: [],
      totalPurchases: 30000,
      outstandingDebt: 2000,
      paymentTerms: 'Net 15',
      notes: 'Dairy products supplier',
      isActive: true,
    },
    {
      name: 'Beverage Co',
      company: 'Beverage Company',
      email: 'orders@beverageco.com',
      phone: '+1 234 567 8908',
      address: '789 Drink Avenue',
      productsSupplied: [],
      totalPurchases: 40000,
      outstandingDebt: 3000,
      paymentTerms: 'Net 30',
      notes: 'Beverage supplier',
      isActive: true,
    },
    {
      name: 'Household Supplies',
      company: 'Household Supplies Inc',
      email: 'orders@household.com',
      phone: '+1 234 567 8909',
      address: '101 Clean Street',
      productsSupplied: [],
      totalPurchases: 25000,
      outstandingDebt: 1500,
      paymentTerms: 'Net 30',
      notes: 'Household items supplier',
      isActive: true,
    },
  ]);
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // Create Products
  console.log('🛒 Creating products...');
  const productData = [
    // Groceries
    { name: 'Rice 10kg', sku: generateSKU(), barcode: `${Date.now()}001`, categoryId: categories[0]._id, buyingPrice: 25, sellingPrice: 30, stockQuantity: 50, minStockLevel: 10, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Rice 25kg', sku: generateSKU(), barcode: `${Date.now()}002`, categoryId: categories[0]._id, buyingPrice: 60, sellingPrice: 75, stockQuantity: 30, minStockLevel: 5, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Cooking Oil 5L', sku: generateSKU(), barcode: `${Date.now()}003`, categoryId: categories[0]._id, buyingPrice: 20, sellingPrice: 25, stockQuantity: 40, minStockLevel: 10, unit: 'L', supplierId: suppliers[0]._id },
    { name: 'Cooking Oil 2L', sku: generateSKU(), barcode: `${Date.now()}004`, categoryId: categories[0]._id, buyingPrice: 9, sellingPrice: 12, stockQuantity: 60, minStockLevel: 15, unit: 'L', supplierId: suppliers[0]._id },
    { name: 'Sugar 5kg', sku: generateSKU(), barcode: `${Date.now()}005`, categoryId: categories[0]._id, buyingPrice: 15, sellingPrice: 20, stockQuantity: 45, minStockLevel: 10, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Sugar 1kg', sku: generateSKU(), barcode: `${Date.now()}006`, categoryId: categories[0]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 80, minStockLevel: 20, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Salt 1kg', sku: generateSKU(), barcode: `${Date.now()}007`, categoryId: categories[0]._id, buyingPrice: 2, sellingPrice: 3, stockQuantity: 100, minStockLevel: 25, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Flour 5kg', sku: generateSKU(), barcode: `${Date.now()}008`, categoryId: categories[0]._id, buyingPrice: 12, sellingPrice: 18, stockQuantity: 35, minStockLevel: 10, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Pasta 500g', sku: generateSKU(), barcode: `${Date.now()}009`, categoryId: categories[0]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 70, minStockLevel: 15, unit: 'pack', supplierId: suppliers[0]._id },
    { name: 'Bread Loaf', sku: generateSKU(), barcode: `${Date.now()}010`, categoryId: categories[0]._id, buyingPrice: 18, sellingPrice: 22, stockQuantity: 20, minStockLevel: 10, unit: 'loaf', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { name: 'Bread Sliced', sku: generateSKU(), barcode: `${Date.now()}011`, categoryId: categories[0]._id, buyingPrice: 20, sellingPrice: 25, stockQuantity: 25, minStockLevel: 10, unit: 'loaf', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { name: 'Beans 2kg', sku: generateSKU(), barcode: `${Date.now()}012`, categoryId: categories[0]._id, buyingPrice: 8, sellingPrice: 12, stockQuantity: 40, minStockLevel: 10, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Tomatoes 1kg', sku: generateSKU(), barcode: `${Date.now()}013`, categoryId: categories[0]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 30, minStockLevel: 10, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { name: 'Onions 1kg', sku: generateSKU(), barcode: `${Date.now()}014`, categoryId: categories[0]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 50, minStockLevel: 15, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Garlic 200g', sku: generateSKU(), barcode: `${Date.now()}015`, categoryId: categories[0]._id, buyingPrice: 1, sellingPrice: 2, stockQuantity: 60, minStockLevel: 15, unit: 'pack', supplierId: suppliers[0]._id },
    
    // Beverages
    { name: 'Coca Cola 2L', sku: generateSKU(), barcode: `${Date.now()}016`, categoryId: categories[1]._id, buyingPrice: 12, sellingPrice: 15, stockQuantity: 8, minStockLevel: 10, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Coca Cola 500ml', sku: generateSKU(), barcode: `${Date.now()}017`, categoryId: categories[1]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 50, minStockLevel: 15, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Pepsi 2L', sku: generateSKU(), barcode: `${Date.now()}018`, categoryId: categories[1]._id, buyingPrice: 12, sellingPrice: 15, stockQuantity: 12, minStockLevel: 10, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Pepsi 500ml', sku: generateSKU(), barcode: `${Date.now()}019`, categoryId: categories[1]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 55, minStockLevel: 15, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Orange Juice 1L', sku: generateSKU(), barcode: `${Date.now()}020`, categoryId: categories[1]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 30, minStockLevel: 10, unit: 'carton', supplierId: suppliers[2]._id, expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    { name: 'Apple Juice 1L', sku: generateSKU(), barcode: `${Date.now()}021`, categoryId: categories[1]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 28, minStockLevel: 10, unit: 'carton', supplierId: suppliers[2]._id, expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    { name: 'Water 500ml', sku: generateSKU(), barcode: `${Date.now()}022`, categoryId: categories[1]._id, buyingPrice: 1, sellingPrice: 2, stockQuantity: 100, minStockLevel: 30, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Water 1.5L', sku: generateSKU(), barcode: `${Date.now()}023`, categoryId: categories[1]._id, buyingPrice: 2, sellingPrice: 3, stockQuantity: 80, minStockLevel: 25, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Energy Drink 250ml', sku: generateSKU(), barcode: `${Date.now()}024`, categoryId: categories[1]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 40, minStockLevel: 15, unit: 'can', supplierId: suppliers[2]._id },
    { name: 'Sports Drink 500ml', sku: generateSKU(), barcode: `${Date.now()}025`, categoryId: categories[1]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 35, minStockLevel: 12, unit: 'bottle', supplierId: suppliers[2]._id },
    { name: 'Milk 1L', sku: generateSKU(), barcode: `${Date.now()}026`, categoryId: categories[1]._id, buyingPrice: 8, sellingPrice: 10, stockQuantity: 60, minStockLevel: 15, unit: 'carton', supplierId: suppliers[1]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: 'Milk 2L', sku: generateSKU(), barcode: `${Date.now()}027`, categoryId: categories[1]._id, buyingPrice: 15, sellingPrice: 18, stockQuantity: 40, minStockLevel: 12, unit: 'carton', supplierId: suppliers[1]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: 'Yogurt 500g', sku: generateSKU(), barcode: `${Date.now()}028`, categoryId: categories[1]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 45, minStockLevel: 15, unit: 'cup', supplierId: suppliers[1]._id, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },

    // Snacks
    { name: 'Potato Chips 150g', sku: generateSKU(), barcode: `${Date.now()}029`, categoryId: categories[2]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 50, minStockLevel: 15, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Corn Chips 150g', sku: generateSKU(), barcode: `${Date.now()}030`, categoryId: categories[2]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 45, minStockLevel: 15, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Cookies 200g', sku: generateSKU(), barcode: `${Date.now()}031`, categoryId: categories[2]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 40, minStockLevel: 12, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Chocolate Bar 100g', sku: generateSKU(), barcode: `${Date.now()}032`, categoryId: categories[2]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 60, minStockLevel: 18, unit: 'bar', supplierId: suppliers[2]._id },
    { name: 'Candy 100g', sku: generateSKU(), barcode: `${Date.now()}033`, categoryId: categories[2]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 70, minStockLevel: 20, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Nuts 200g', sku: generateSKU(), barcode: `${Date.now()}034`, categoryId: categories[2]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 35, minStockLevel: 10, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Popcorn 100g', sku: generateSKU(), barcode: `${Date.now()}035`, categoryId: categories[2]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 55, minStockLevel: 15, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Crackers 200g', sku: generateSKU(), barcode: `${Date.now()}036`, categoryId: categories[2]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 42, minStockLevel: 12, unit: 'pack', supplierId: suppliers[2]._id },
    { name: 'Granola Bar 50g', sku: generateSKU(), barcode: `${Date.now()}037`, categoryId: categories[2]._id, buyingPrice: 2, sellingPrice: 3, stockQuantity: 65, minStockLevel: 18, unit: 'bar', supplierId: suppliers[2]._id },
    { name: 'Dried Fruit 150g', sku: generateSKU(), barcode: `${Date.now()}038`, categoryId: categories[2]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 38, minStockLevel: 12, unit: 'pack', supplierId: suppliers[2]._id },

    // Frozen Foods
    { name: 'Frozen Pizza 400g', sku: generateSKU(), barcode: `${Date.now()}039`, categoryId: categories[3]._id, buyingPrice: 8, sellingPrice: 12, stockQuantity: 25, minStockLevel: 8, unit: 'piece', supplierId: suppliers[0]._id },
    { name: 'Ice Cream 1L', sku: generateSKU(), barcode: `${Date.now()}040`, categoryId: categories[3]._id, buyingPrice: 10, sellingPrice: 15, stockQuantity: 30, minStockLevel: 10, unit: 'tub', supplierId: suppliers[1]._id },
    { name: 'Frozen Vegetables 500g', sku: generateSKU(), barcode: `${Date.now()}041`, categoryId: categories[3]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 35, minStockLevel: 12, unit: 'pack', supplierId: suppliers[0]._id },
    { name: 'Frozen Chicken 1kg', sku: generateSKU(), barcode: `${Date.now()}042`, categoryId: categories[3]._id, buyingPrice: 12, sellingPrice: 18, stockQuantity: 20, minStockLevel: 8, unit: 'kg', supplierId: suppliers[0]._id },
    { name: 'Frozen Fish 500g', sku: generateSKU(), barcode: `${Date.now()}043`, categoryId: categories[3]._id, buyingPrice: 8, sellingPrice: 12, stockQuantity: 22, minStockLevel: 8, unit: 'pack', supplierId: suppliers[0]._id },
    { name: 'Frozen Fries 500g', sku: generateSKU(), barcode: `${Date.now()}044`, categoryId: categories[3]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 28, minStockLevel: 10, unit: 'pack', supplierId: suppliers[0]._id },
    { name: 'Frozen Burritos 200g', sku: generateSKU(), barcode: `${Date.now()}045`, categoryId: categories[3]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 32, minStockLevel: 10, unit: 'piece', supplierId: suppliers[0]._id },
    { name: 'Frozen Dumplings 300g', sku: generateSKU(), barcode: `${Date.now()}046`, categoryId: categories[3]._id, buyingPrice: 6, sellingPrice: 9, stockQuantity: 26, minStockLevel: 8, unit: 'pack', supplierId: suppliers[0]._id },

    // Meat & Chicken
    { name: 'Fresh Chicken 1kg', sku: generateSKU(), barcode: `${Date.now()}047`, categoryId: categories[4]._id, buyingPrice: 15, sellingPrice: 22, stockQuantity: 18, minStockLevel: 8, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { name: 'Beef 1kg', sku: generateSKU(), barcode: `${Date.now()}048`, categoryId: categories[4]._id, buyingPrice: 25, sellingPrice: 35, stockQuantity: 15, minStockLevel: 6, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { name: 'Pork 1kg', sku: generateSKU(), barcode: `${Date.now()}049`, categoryId: categories[4]._id, buyingPrice: 20, sellingPrice: 28, stockQuantity: 16, minStockLevel: 6, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { name: 'Fish 1kg', sku: generateSKU(), barcode: `${Date.now()}050`, categoryId: categories[4]._id, buyingPrice: 18, sellingPrice: 25, stockQuantity: 20, minStockLevel: 8, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { name: 'Sausages 500g', sku: generateSKU(), barcode: `${Date.now()}051`, categoryId: categories[4]._id, buyingPrice: 8, sellingPrice: 12, stockQuantity: 25, minStockLevel: 10, unit: 'pack', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { name: 'Bacon 300g', sku: generateSKU(), barcode: `${Date.now()}052`, categoryId: categories[4]._id, buyingPrice: 10, sellingPrice: 15, stockQuantity: 22, minStockLevel: 8, unit: 'pack', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: 'Minced Meat 500g', sku: generateSKU(), barcode: `${Date.now()}053`, categoryId: categories[4]._id, buyingPrice: 12, sellingPrice: 18, stockQuantity: 24, minStockLevel: 10, unit: 'pack', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { name: 'Chicken Wings 1kg', sku: generateSKU(), barcode: `${Date.now()}054`, categoryId: categories[4]._id, buyingPrice: 14, sellingPrice: 20, stockQuantity: 19, minStockLevel: 8, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },

    // Vegetables
    { name: 'Carrots 1kg', sku: generateSKU(), barcode: `${Date.now()}055`, categoryId: categories[5]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 40, minStockLevel: 15, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: 'Potatoes 2kg', sku: generateSKU(), barcode: `${Date.now()}056`, categoryId: categories[5]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 50, minStockLevel: 18, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    { name: 'Cabbage 1kg', sku: generateSKU(), barcode: `${Date.now()}057`, categoryId: categories[5]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 35, minStockLevel: 12, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    { name: 'Lettuce 500g', sku: generateSKU(), barcode: `${Date.now()}058`, categoryId: categories[5]._id, buyingPrice: 2, sellingPrice: 3, stockQuantity: 30, minStockLevel: 10, unit: 'head', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { name: 'Broccoli 500g', sku: generateSKU(), barcode: `${Date.now()}059`, categoryId: categories[5]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 25, minStockLevel: 10, unit: 'head', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
    { name: 'Spinach 500g', sku: generateSKU(), barcode: `${Date.now()}060`, categoryId: categories[5]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 28, minStockLevel: 10, unit: 'bunch', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { name: 'Peppers 500g', sku: generateSKU(), barcode: `${Date.now()}061`, categoryId: categories[5]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 32, minStockLevel: 12, unit: 'pack', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) },
    { name: 'Cucumber 500g', sku: generateSKU(), barcode: `${Date.now()}062`, categoryId: categories[5]._id, buyingPrice: 2, sellingPrice: 3, stockQuantity: 38, minStockLevel: 14, unit: 'piece', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },

    // Fruits
    { name: 'Apples 1kg', sku: generateSKU(), barcode: `${Date.now()}063`, categoryId: categories[6]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 45, minStockLevel: 15, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    { name: 'Bananas 1kg', sku: generateSKU(), barcode: `${Date.now()}064`, categoryId: categories[6]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 50, minStockLevel: 18, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { name: 'Oranges 1kg', sku: generateSKU(), barcode: `${Date.now()}065`, categoryId: categories[6]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 42, minStockLevel: 15, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    { name: 'Grapes 500g', sku: generateSKU(), barcode: `${Date.now()}066`, categoryId: categories[6]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 30, minStockLevel: 12, unit: 'bunch', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: 'Strawberries 500g', sku: generateSKU(), barcode: `${Date.now()}067`, categoryId: categories[6]._id, buyingPrice: 6, sellingPrice: 10, stockQuantity: 25, minStockLevel: 10, unit: 'pack', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { name: 'Mangoes 1kg', sku: generateSKU(), barcode: `${Date.now()}068`, categoryId: categories[6]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 28, minStockLevel: 10, unit: 'kg', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: 'Pineapple 1kg', sku: generateSKU(), barcode: `${Date.now()}069`, categoryId: categories[6]._id, buyingPrice: 4, sellingPrice: 7, stockQuantity: 22, minStockLevel: 8, unit: 'piece', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
    { name: 'Watermelon 1kg', sku: generateSKU(), barcode: `${Date.now()}070`, categoryId: categories[6]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 20, minStockLevel: 8, unit: 'piece', supplierId: suppliers[0]._id, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },

    // Household Items
    { name: 'Detergent 2L', sku: generateSKU(), barcode: `${Date.now()}071`, categoryId: categories[7]._id, buyingPrice: 8, sellingPrice: 12, stockQuantity: 35, minStockLevel: 12, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Dish Soap 500ml', sku: generateSKU(), barcode: `${Date.now()}072`, categoryId: categories[7]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 45, minStockLevel: 15, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Hand Soap 300ml', sku: generateSKU(), barcode: `${Date.now()}073`, categoryId: categories[7]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 50, minStockLevel: 18, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Bleach 1L', sku: generateSKU(), barcode: `${Date.now()}074`, categoryId: categories[7]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 30, minStockLevel: 10, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Toilet Paper 12 rolls', sku: generateSKU(), barcode: `${Date.now()}075`, categoryId: categories[7]._id, buyingPrice: 10, sellingPrice: 15, stockQuantity: 25, minStockLevel: 10, unit: 'pack', supplierId: suppliers[3]._id },
    { name: 'Paper Towels 6 rolls', sku: generateSKU(), barcode: `${Date.now()}076`, categoryId: categories[7]._id, buyingPrice: 6, sellingPrice: 9, stockQuantity: 32, minStockLevel: 12, unit: 'pack', supplierId: suppliers[3]._id },
    { name: 'Trash Bags 20 count', sku: generateSKU(), barcode: `${Date.now()}077`, categoryId: categories[7]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 28, minStockLevel: 10, unit: 'pack', supplierId: suppliers[3]._id },
    { name: 'Sponges 5 pack', sku: generateSKU(), barcode: `${Date.now()}078`, categoryId: categories[7]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 40, minStockLevel: 15, unit: 'pack', supplierId: suppliers[3]._id },
    { name: 'Cleaning Spray 500ml', sku: generateSKU(), barcode: `${Date.now()}079`, categoryId: categories[7]._id, buyingPrice: 4, sellingPrice: 7, stockQuantity: 35, minStockLevel: 12, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Laundry Detergent 2kg', sku: generateSKU(), barcode: `${Date.now()}080`, categoryId: categories[7]._id, buyingPrice: 12, sellingPrice: 18, stockQuantity: 22, minStockLevel: 8, unit: 'box', supplierId: suppliers[3]._id },

    // Personal Care
    { name: 'Toothpaste 100g', sku: generateSKU(), barcode: `${Date.now()}081`, categoryId: categories[8]._id, buyingPrice: 3, sellingPrice: 5, stockQuantity: 45, minStockLevel: 15, unit: 'tube', supplierId: suppliers[3]._id },
    { name: 'Toothbrush', sku: generateSKU(), barcode: `${Date.now()}082`, categoryId: categories[8]._id, buyingPrice: 2, sellingPrice: 4, stockQuantity: 50, minStockLevel: 18, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'Shampoo 400ml', sku: generateSKU(), barcode: `${Date.now()}083`, categoryId: categories[8]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 35, minStockLevel: 12, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Conditioner 400ml', sku: generateSKU(), barcode: `${Date.now()}084`, categoryId: categories[8]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 32, minStockLevel: 12, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Body Wash 500ml', sku: generateSKU(), barcode: `${Date.now()}085`, categoryId: categories[8]._id, buyingPrice: 4, sellingPrice: 7, stockQuantity: 38, minStockLevel: 14, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Deodorant 100g', sku: generateSKU(), barcode: `${Date.now()}086`, categoryId: categories[8]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 42, minStockLevel: 15, unit: 'stick', supplierId: suppliers[3]._id },
    { name: 'Razor 5 pack', sku: generateSKU(), barcode: `${Date.now()}087`, categoryId: categories[8]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 30, minStockLevel: 10, unit: 'pack', supplierId: suppliers[3]._id },
    { name: 'Hand Sanitizer 500ml', sku: generateSKU(), barcode: `${Date.now()}088`, categoryId: categories[8]._id, buyingPrice: 4, sellingPrice: 6, stockQuantity: 40, minStockLevel: 14, unit: 'bottle', supplierId: suppliers[3]._id },
    { name: 'Face Wash 100ml', sku: generateSKU(), barcode: `${Date.now()}089`, categoryId: categories[8]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 28, minStockLevel: 10, unit: 'tube', supplierId: suppliers[3]._id },
    { name: 'Lotion 300ml', sku: generateSKU(), barcode: `${Date.now()}090`, categoryId: categories[8]._id, buyingPrice: 5, sellingPrice: 8, stockQuantity: 33, minStockLevel: 12, unit: 'bottle', supplierId: suppliers[3]._id },

    // Electronics/Accessories
    { name: 'Phone Charger', sku: generateSKU(), barcode: `${Date.now()}091`, categoryId: categories[9]._id, buyingPrice: 8, sellingPrice: 15, stockQuantity: 20, minStockLevel: 8, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'USB Cable 1m', sku: generateSKU(), barcode: `${Date.now()}092`, categoryId: categories[9]._id, buyingPrice: 3, sellingPrice: 6, stockQuantity: 35, minStockLevel: 12, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'Earbuds', sku: generateSKU(), barcode: `${Date.now()}093`, categoryId: categories[9]._id, buyingPrice: 10, sellingPrice: 18, stockQuantity: 25, minStockLevel: 10, unit: 'pair', supplierId: suppliers[3]._id },
    { name: 'Phone Case', sku: generateSKU(), barcode: `${Date.now()}094`, categoryId: categories[9]._id, buyingPrice: 5, sellingPrice: 10, stockQuantity: 30, minStockLevel: 12, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'Screen Protector', sku: generateSKU(), barcode: `${Date.now()}095`, categoryId: categories[9]._id, buyingPrice: 3, sellingPrice: 6, stockQuantity: 40, minStockLevel: 15, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'Power Bank 10000mAh', sku: generateSKU(), barcode: `${Date.now()}096`, categoryId: categories[9]._id, buyingPrice: 15, sellingPrice: 25, stockQuantity: 15, minStockLevel: 6, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'Bluetooth Speaker', sku: generateSKU(), barcode: `${Date.now()}097`, categoryId: categories[9]._id, buyingPrice: 20, sellingPrice: 35, stockQuantity: 12, minStockLevel: 5, unit: 'piece', supplierId: suppliers[3]._id },
    { name: 'Headphones', sku: generateSKU(), barcode: `${Date.now()}098`, categoryId: categories[9]._id, buyingPrice: 25, sellingPrice: 45, stockQuantity: 10, minStockLevel: 5, unit: 'piece', supplierId: suppliers[3]._id },
  ];

  const products = await Product.create(
    productData.map(p => ({
      ...p,
      branchId: branch._id,
      images: [],
      description: `High quality ${p.name}`,
      isActive: true,
    }))
  );
  console.log(`✅ Created ${products.length} products`);

  // Create Customers
  console.log('👤 Creating customers...');
  const customerData = [];
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'James', 'Lisa', 'Robert', 'Maria', 'William', 'Sophia', 'Richard', 'Olivia', 'Joseph', 'Emily', 'Thomas', 'Ava', 'Charles', 'Isabella'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'];

  for (let i = 0; i < 50; i++) {
    const firstName = randomPick(firstNames);
    const lastName = randomPick(lastNames);
    const isReturning = Math.random() > 0.4;
    const totalSpent = isReturning ? randomInt(100, 5000) : randomInt(10, 200);
    const purchaseCount = isReturning ? randomInt(5, 50) : randomInt(1, 5);
    const loyaltyPoints = Math.floor(totalSpent / 10);

    customerData.push({
      customerId: generateCustomerId(),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      phone: `+1 ${randomInt(200, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      address: `${randomInt(100, 999)} ${randomPick(['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Maple Ln'])}`,
      loyaltyPoints,
      totalSpent,
      purchaseCount,
      lastPurchaseDate: isReturning ? randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()) : undefined,
      favoriteProducts: [],
      favoriteCategories: [],
      notes: isReturning ? 'Returning customer' : 'New customer',
    });
  }

  const customers = await Customer.create(customerData);
  console.log(`✅ Created ${customers.length} customers`);

  // Create Sales Transactions
  console.log('💰 Creating sales transactions...');
  const salesData = [];
  const paymentMethods = ['cash', 'card', 'transfer', 'paystack'];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const endDate = new Date();

  for (let i = 0; i < 500; i++) {
    const numItems = randomInt(1, 8);
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = randomPick(products);
      const quantity = randomInt(1, 5);
      const total = product.sellingPrice * quantity;
      subtotal += total;

      items.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        discount: 0,
        total,
      });
    }

    const discount = Math.random() > 0.8 ? Math.floor(subtotal * 0.1) : 0; // 10% discount max
    const tax = 0;
    const total = subtotal - discount + tax;
    const paymentMethod = randomPick(paymentMethods);
    const cashReceived = paymentMethod === 'cash' ? total + randomInt(0, 50) : total;
    const change = paymentMethod === 'cash' ? cashReceived - total : 0;
    const saleDate = randomDate(startDate, endDate);
    const cashier = randomPick([adminUser, managerUser, ...cashiers]);
    const customer = Math.random() > 0.3 ? randomPick(customers) : undefined;

    salesData.push({
      saleNumber: `SALE-${Date.now()}-${i}`,
      customerId: customer?._id,
      customerName: customer?.name,
      items,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      paymentStatus: 'paid',
      cashReceived,
      change,
      cashierId: cashier._id,
      branchId: branch._id,
      status: 'completed',
      createdAt: saleDate,
      updatedAt: saleDate,
    });
  }

  const sales = await Sale.insertMany(salesData);
  console.log(`✅ Created ${sales.length} sales transactions`);

  // Create Loyalty Records
  console.log('🎁 Creating loyalty records...');
  const loyaltyData = customers.map(customer => {
    const totalSpent = customer.totalSpent;
    let level = 'bronze';
    if (totalSpent >= 100000) level = 'platinum';
    else if (totalSpent >= 50000) level = 'gold';
    else if (totalSpent >= 20000) level = 'silver';

    return {
      customerId: customer._id,
      pointsBalance: customer.loyaltyPoints,
      pointsEarned: customer.loyaltyPoints,
      pointsRedeemed: 0,
      level,
      totalSpent,
      rewards: [],
    };
  });

  await Loyalty.create(loyaltyData);
  console.log(`✅ Created ${loyaltyData.length} loyalty records`);

  // Create Transaction Records
  console.log('📝 Creating transaction records...');
  const transactionData = sales.map((sale: any) => {
    const pointsEarned = Math.floor(sale.total / 10);

    return {
      transactionId: generateTransactionId(),
      customerId: sale.customerId,
      orderId: sale._id,
      items: sale.items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: item.sellingPrice,
        total: item.total,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      pointsEarned,
      branchId: sale.branchId,
      cashierId: sale.cashierId,
      createdAt: sale.createdAt,
    };
  });

  await Transaction.create(transactionData);
  console.log(`✅ Created ${transactionData.length} transaction records`);

  // Create Employees
  console.log('👔 Creating employees...');
  const employees = await Employee.create([
    {
      userId: managerUser._id,
      employeeId: 'EMP-001',
      position: 'Store Manager',
      department: 'Management',
      salary: 5000,
      hireDate: new Date('2023-01-01'),
      branchId: branch._id,
      isActive: true,
      performance: {
        totalSales: 150000,
        totalTransactions: 1500,
        averageTransactionValue: 100,
        lastMonthSales: 15000,
      },
      attendance: {
        present: 100,
        absent: 5,
        late: 3,
      },
    },
    {
      userId: cashiers[0]._id,
      employeeId: 'EMP-002',
      position: 'Cashier',
      department: 'Sales',
      salary: 2500,
      hireDate: new Date('2023-06-01'),
      branchId: branch._id,
      isActive: true,
      performance: {
        totalSales: 80000,
        totalTransactions: 1200,
        averageTransactionValue: 67,
        lastMonthSales: 8000,
      },
      attendance: {
        present: 80,
        absent: 8,
        late: 5,
      },
    },
    {
      userId: cashiers[1]._id,
      employeeId: 'EMP-003',
      position: 'Cashier',
      department: 'Sales',
      salary: 2500,
      hireDate: new Date('2023-07-15'),
      branchId: branch._id,
      isActive: true,
      performance: {
        totalSales: 75000,
        totalTransactions: 1100,
        averageTransactionValue: 68,
        lastMonthSales: 7500,
      },
      attendance: {
        present: 75,
        absent: 10,
        late: 6,
      },
    },
    {
      userId: cashiers[2]._id,
      employeeId: 'EMP-004',
      position: 'Cashier',
      department: 'Sales',
      salary: 2500,
      hireDate: new Date('2023-08-01'),
      branchId: branch._id,
      isActive: true,
      performance: {
        totalSales: 70000,
        totalTransactions: 1000,
        averageTransactionValue: 70,
        lastMonthSales: 7000,
      },
      attendance: {
        present: 78,
        absent: 9,
        late: 4,
      },
    },
  ]);
  console.log(`✅ Created ${employees.length} employees`);

  // Create Expenses
  console.log('💸 Creating expenses...');
  const expenses = await Expense.create([
    {
      title: 'Monthly Rent',
      description: 'Store rent for the month',
      category: 'rent',
      amount: 2000,
      date: new Date(),
      branchId: branch._id,
      paidTo: 'Landlord',
      notes: 'Monthly payment',
      createdBy: adminUser._id,
    },
    {
      title: 'Electricity Bill',
      description: 'Monthly electricity consumption',
      category: 'electricity',
      amount: 500,
      date: new Date(),
      branchId: branch._id,
      paidTo: 'Power Company',
      notes: 'Monthly payment',
      createdBy: adminUser._id,
    },
    {
      title: 'Staff Salary',
      description: 'Monthly salary payments',
      category: 'salary',
      amount: 12500,
      date: new Date(),
      branchId: branch._id,
      paidTo: 'Staff',
      notes: 'Monthly payment',
      createdBy: adminUser._id,
    },
    {
      title: 'Internet Bill',
      description: 'Monthly internet service',
      category: 'other',
      amount: 100,
      date: new Date(),
      branchId: branch._id,
      paidTo: 'ISP',
      notes: 'Monthly payment',
      createdBy: adminUser._id,
    },
    {
      title: 'Security Services',
      description: 'Monthly security services',
      category: 'maintenance',
      amount: 300,
      date: new Date(),
      branchId: branch._id,
      paidTo: 'Security Company',
      notes: 'Monthly payment',
      createdBy: adminUser._id,
    },
  ]);
  console.log(`✅ Created ${expenses.length} expenses`);

  // Create Notifications
  console.log('🔔 Creating notifications...');
  const lowStockProducts = products.filter(p => p.stockQuantity <= p.minStockLevel);
  const expiringProducts = products.filter(p => p.expiryDate && p.expiryDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await Notification.insertMany([
    {
      title: 'Low Stock Alert',
      message: `${lowStockProducts.length} products are running low on stock`,
      type: 'warning',
      category: 'system',
      priority: 'high',
      userId: adminUser._id,
      branchId: branch._id,
      isRead: false,
      metadata: { productCount: lowStockProducts.length },
    },
    {
      title: 'Expiring Products',
      message: `${expiringProducts.length} products expire soon`,
      type: 'warning',
      category: 'expiry',
      priority: 'high',
      userId: adminUser._id,
      branchId: branch._id,
      isRead: false,
      metadata: { productCount: expiringProducts.length },
    },
    {
      title: 'Supplier Payment Due',
      message: 'Food Corp payment of $5000 is due soon',
      type: 'warning',
      category: 'payment',
      priority: 'medium',
      userId: adminUser._id,
      branchId: branch._id,
      isRead: true,
      metadata: { supplierId: suppliers[0]._id, amount: 5000 },
    },
    {
      title: 'Daily Sales Summary',
      message: `Today's sales: ₦${sales.filter((s:any) => new Date(s.createdAt).toDateString() === new Date().toDateString()).reduce((sum: number, s: any) => sum + s.total, 0).toLocaleString()}`,
      type: 'info',
      category: 'system',
      priority: 'low',
      userId: adminUser._id,
      branchId: branch._id,
      isRead: false,
      metadata: { date: new Date() },
    },
  ]);
  console.log(`✅ Created notifications`);

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Branches: 1`);
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Suppliers: ${suppliers.length}`);
  console.log(`   - Customers: ${customers.length}`);
  console.log(`   - Sales Transactions: ${sales.length}`);
  console.log(`   - Loyalty Records: ${loyaltyData.length}`);
  console.log(`   - Transaction Records: ${transactionData.length}`);
  console.log(`   - Employees: ${employees.length}`);
  console.log(`   - Expenses: ${expenses.length}`);
  console.log(`   - Users: 5 (1 admin, 1 manager, 3 cashiers)`);
  console.log('\n🔐 Demo Credentials:');
  console.log('   Admin: admin@smartmart.com / admin123');
  console.log('   Manager: manager@smartmart.com / manager123');
  console.log('   Cashiers: sarah@smartmart.com / cashier123');
  console.log('              mike@smartmart.com / cashier123');
  console.log('              emma@smartmart.com / cashier123');
}

// Run seed if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
