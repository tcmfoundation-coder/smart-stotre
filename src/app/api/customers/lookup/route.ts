import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Customer } from '@/models';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    if (!phone && !email) {
      return NextResponse.json(
        { success: false, message: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    let customer;
    
    if (phone) {
      customer = await Customer.findOne({ phone });
    } else if (email) {
      customer = await Customer.findOne({ email });
    }

    if (customer) {
      return NextResponse.json({
        success: true,
        data: {
          _id: customer._id,
          customerId: customer.customerId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          loyaltyPoints: customer.loyaltyPoints,
          totalSpent: customer.totalSpent,
          purchaseCount: customer.purchaseCount,
          lastPurchaseDate: customer.lastPurchaseDate,
          favoriteProducts: customer.favoriteProducts,
          favoriteCategories: customer.favoriteCategories,
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Customer not found',
    }, { status: 404 });

  } catch (error) {
    console.error('Error looking up customer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to lookup customer' },
      { status: 500 }
    );
  }
}
