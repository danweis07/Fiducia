/**
 * Check Ordering Types
 *
 * Check styles and order entities.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// CHECK ORDERING
// =============================================================================

export type CheckOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface CheckStyle {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'standard' | 'premium' | 'scenic' | 'character';
  pricePerBoxCents: number;
  isAvailable: boolean;
}

export interface CheckOrder {
  id: string;
  accountId: string;
  accountMasked: string;
  styleId: string;
  styleName: string;
  quantity: number;
  startingCheckNumber: string;
  shippingMethod: 'standard' | 'expedited' | 'overnight';
  shippingCostCents: number;
  totalCostCents: number;
  status: CheckOrderStatus;
  trackingNumber: string | null;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}
