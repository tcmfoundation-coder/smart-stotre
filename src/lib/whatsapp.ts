'use server';

import connectDB from '@/lib/mongodb';
import { WhatsAppMessage } from '@/models';
import { escapeRegex } from '@/lib/utils';
import { requireManagerOrAdmin } from '@/lib/security';

interface SendWhatsAppMessageParams {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  message: string;
  saleId?: string;
  amount?: number;
}

export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams) {
  await connectDB();

  const { customerId, customerName, customerPhone, message, saleId, amount } = params;

  console.log('📱 Attempting to send WhatsApp message:', {
    customerName,
    customerPhone,
    messageLength: message?.length,
    saleId,
    amount,
  });

  // Create message record with pending status
  let whatsappMessage;
  try {
    whatsappMessage = await WhatsAppMessage.create({
      customerId,
      customerName,
      customerPhone,
      message,
      status: 'pending',
      saleId,
      amount,
    });
    console.log('✅ WhatsApp message record created:', whatsappMessage._id);
  } catch (dbError: any) {
    console.error('❌ Failed to create WhatsApp message record:', dbError);
    return {
      success: false,
      error: `Database error: ${dbError.message}`,
    };
  }

  // Check if WhatsApp API is configured
  const apiKey = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  console.log('🔑 WhatsApp API Configuration:', {
    hasApiKey: !!apiKey,
    hasPhoneNumberId: !!phoneNumberId,
  });

  if (!apiKey || !phoneNumberId) {
    // Demo mode - simulate successful sending
    console.log('🎭 WhatsApp API not configured. Using demo mode.');
    console.log('📤 Mock WhatsApp message:', {
      to: customerPhone,
      message: message,
    });

    // Update message record as sent
    try {
      await WhatsAppMessage.findByIdAndUpdate(whatsappMessage._id, {
        status: 'sent',
        sentAt: new Date(),
      });
      console.log('✅ Demo mode: Message marked as sent');
    } catch (updateError: any) {
      console.error('❌ Failed to update message status in demo mode:', updateError);
    }

    return {
      success: true,
      demoMode: true,
      messageId: whatsappMessage._id,
    };
  }

  // Real WhatsApp API integration
  try {
    console.log('🌐 Sending real WhatsApp message via API...');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'text',
          text: {
            body: message,
          },
        }),
      }
    );

    const data = await response.json();
    console.log('📨 WhatsApp API response:', { status: response.status, data });

    if (response.ok && !data.error) {
      // Update message record as sent
      await WhatsAppMessage.findByIdAndUpdate(whatsappMessage._id, {
        status: 'sent',
        sentAt: new Date(),
      });
      console.log('✅ Real WhatsApp message sent successfully');

      return {
        success: true,
        demoMode: false,
        messageId: whatsappMessage._id,
        whatsappMessageId: data.messages?.[0]?.id,
      };
    } else {
      // Update message record as failed
      await WhatsAppMessage.findByIdAndUpdate(whatsappMessage._id, {
        status: 'failed',
        errorMessage: data.error?.message || 'Unknown error',
      });
      console.error('❌ WhatsApp API returned error:', data.error);

      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message',
        messageId: whatsappMessage._id,
      };
    }
  } catch (error: any) {
    console.error('❌ WhatsApp API network error:', error);
    
    // Update message record as failed
    try {
      await WhatsAppMessage.findByIdAndUpdate(whatsappMessage._id, {
        status: 'failed',
        errorMessage: error.message || 'Network error',
      });
    } catch (updateError: any) {
      console.error('❌ Failed to update failed status:', updateError);
    }

    return {
      success: false,
      error: error.message || 'Network error occurred',
      messageId: whatsappMessage._id,
    };
  }
}

export async function getWhatsAppMessages(filters?: {
  status?: 'sent' | 'failed' | 'pending';
  customerId?: string;
  limit?: number;
  search?: string;
}) {
  // Matches the manager/admin-only nav entry for this page and exposes
  // customer names/phone numbers/message content.
  await requireManagerOrAdmin();
  await connectDB();

  const query: any = {};

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.customerId) {
    query.customerId = filters.customerId;
  }

  if (filters?.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { customerName: { $regex: safeSearch, $options: 'i' } },
      { customerPhone: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const messages = await WhatsAppMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(filters?.limit || 100)
    .populate('customerId', 'name phone')
    .populate('saleId', 'saleNumber total');

  return JSON.parse(JSON.stringify(messages));
}

export async function getWhatsAppMessageStats() {
  await requireManagerOrAdmin();
  await connectDB();

  const total = await WhatsAppMessage.countDocuments();
  const sent = await WhatsAppMessage.countDocuments({ status: 'sent' });
  const failed = await WhatsAppMessage.countDocuments({ status: 'failed' });
  const pending = await WhatsAppMessage.countDocuments({ status: 'pending' });

  return {
    total,
    sent,
    failed,
    pending,
    successRate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
  };
}
