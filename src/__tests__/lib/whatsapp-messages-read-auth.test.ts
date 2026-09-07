import { getWhatsAppMessages, getWhatsAppMessageStats } from '@/lib/whatsapp';
import { requireManagerOrAdmin } from '@/lib/security';
import { WhatsAppMessage } from '@/models';

jest.mock('@/lib/security', () => ({
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  WhatsAppMessage: { find: jest.fn(), countDocuments: jest.fn() },
}));

describe('WhatsApp message read actions require manager/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireManagerOrAdmin as jest.Mock).mockRejectedValue(new Error('Manager or admin access required'));
  });

  it('getWhatsAppMessages rejects a cashier before querying', async () => {
    await expect(getWhatsAppMessages()).rejects.toThrow('Manager or admin access required');
    expect(WhatsAppMessage.find).not.toHaveBeenCalled();
  });

  it('getWhatsAppMessageStats rejects a cashier before querying', async () => {
    await expect(getWhatsAppMessageStats()).rejects.toThrow('Manager or admin access required');
    expect(WhatsAppMessage.countDocuments).not.toHaveBeenCalled();
  });
});
