import { z, ZodType } from 'zod';
import { CreateTransactionRequest } from '../model/transaction-model';

export class TransactionValidation {
  static readonly CREATE: ZodType<CreateTransactionRequest> = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
    ticketTierId: z.string().min(1, 'Ticket tier ID is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    pointsUsed: z.number().int().min(0).default(0).optional(),
    couponCode: z.string().max(50).optional(),
  });
}
