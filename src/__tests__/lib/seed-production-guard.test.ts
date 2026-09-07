import { seedDatabase } from '@/lib/seed';
import connectDB from '@/lib/mongodb';

jest.mock('@/lib/load-env', () => ({}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models', () => ({
  User: { deleteMany: jest.fn() },
  Category: { deleteMany: jest.fn() },
  Product: { deleteMany: jest.fn() },
  Customer: { deleteMany: jest.fn() },
  Supplier: { deleteMany: jest.fn() },
  Expense: { deleteMany: jest.fn() },
  Employee: { deleteMany: jest.fn() },
  Branch: { deleteMany: jest.fn() },
  Notification: { deleteMany: jest.fn() },
  Sale: { deleteMany: jest.fn() },
  Loyalty: { deleteMany: jest.fn() },
  Transaction: { deleteMany: jest.fn() },
}));

// @types/node marks NODE_ENV as read-only.
function setNodeEnv(value: string | undefined) {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
}

describe('seedDatabase production safety guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOverride = process.env.ALLOW_PRODUCTION_SEED;

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    if (originalOverride === undefined) {
      delete process.env.ALLOW_PRODUCTION_SEED;
    } else {
      process.env.ALLOW_PRODUCTION_SEED = originalOverride;
    }
    jest.clearAllMocks();
  });

  it('refuses to run and never connects when NODE_ENV=production', async () => {
    setNodeEnv('production');
    delete process.env.ALLOW_PRODUCTION_SEED;

    await expect(seedDatabase()).rejects.toThrow(/Refusing to run seedDatabase\(\) with NODE_ENV=production/);
    expect(connectDB).not.toHaveBeenCalled();
  });

  it('still refuses production seeding when the override is anything other than the exact string "true"', async () => {
    setNodeEnv('production');
    process.env.ALLOW_PRODUCTION_SEED = 'yes';

    await expect(seedDatabase()).rejects.toThrow(/Refusing to run seedDatabase/);
    expect(connectDB).not.toHaveBeenCalled();
  });

  it('proceeds when NODE_ENV is not production', async () => {
    setNodeEnv('test');
    (connectDB as jest.Mock).mockResolvedValue(undefined);

    // Real seeding does a great deal more after this and would throw on the
    // mocked models eventually - reaching past the guard and calling
    // connectDB at all is sufficient proof the guard did not block it.
    await expect(seedDatabase()).rejects.toThrow();
    expect(connectDB).toHaveBeenCalled();
  });

  it('proceeds in production when ALLOW_PRODUCTION_SEED=true is explicitly set', async () => {
    setNodeEnv('production');
    process.env.ALLOW_PRODUCTION_SEED = 'true';
    (connectDB as jest.Mock).mockResolvedValue(undefined);

    await expect(seedDatabase()).rejects.toThrow();
    expect(connectDB).toHaveBeenCalled();
  });
});
