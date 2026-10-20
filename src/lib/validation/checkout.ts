import { z } from 'zod';

export const checkoutItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Maximum 20 per item'),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional().default(''),
});

export const checkoutCustomerFieldsSchema = z
  .object({
    orderType: z.enum(['pickup', 'delivery']),
    customerName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters')
      .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, and hyphens'),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)'),
    deliveryAddress: z.string().max(300, 'Address cannot exceed 300 characters').optional(),
    preferredTime: z.string().min(1, 'Please select your preferred time').default('ASAP'),
    customerNotes: z.string().max(250, 'Notes cannot exceed 250 characters').optional().default(''),
    paymentMethod: z.enum(['cash_on_delivery', 'upi_on_delivery']),
  })
  .refine(
    (data) => {
      if (data.orderType === 'delivery') {
        return !!data.deliveryAddress && data.deliveryAddress.trim().length >= 10;
      }
      return true;
    },
    {
      message: 'Please provide a detailed delivery address with street and landmark (min 10 characters)',
      path: ['deliveryAddress'],
    }
  );

export const checkoutFormSchema = z.object({
  orderType: z.enum(['pickup', 'delivery']),
  customerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, and hyphens'),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)'),
  deliveryAddress: z.string().max(300, 'Address cannot exceed 300 characters').optional(),
  preferredTime: z.string().min(1, 'Please select your preferred time').default('ASAP'),
  customerNotes: z.string().max(250, 'Notes cannot exceed 250 characters').optional().default(''),
  paymentMethod: z.enum(['cash_on_delivery', 'upi_on_delivery']),
  items: z.array(checkoutItemSchema).min(1, 'Your cart is empty. Please add items to checkout.'),
}).refine(
  (data) => {
    if (data.orderType === 'delivery') {
      return !!data.deliveryAddress && data.deliveryAddress.trim().length >= 10;
    }
    return true;
  },
  {
    message: 'Please provide a detailed delivery address with street and landmark (min 10 characters)',
    path: ['deliveryAddress'],
  }
);

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
export type CheckoutItemData = z.infer<typeof checkoutItemSchema>;
export type CheckoutCustomerFields = z.infer<typeof checkoutCustomerFieldsSchema>;
