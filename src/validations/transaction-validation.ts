import { z, ZodType } from 'zod';
import {
  CreateTransactionRequest,
  PaymentProofRequest,
  TransactionFilterRequest,
} from '../model/transaction-model';
import { TransactionStatus } from '../generated/prisma/enums';

export class TransactionValidation {
  static readonly CREATE: ZodType<CreateTransactionRequest> = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
    ticketTierId: z.string().min(1, 'Ticket tier ID is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    pointsUsed: z.number().int().min(0).default(0).optional(),
    couponCode: z.string().max(50).optional(),
  });

  static readonly FILTER: ZodType<TransactionFilterRequest> = z.object({
    status: z.enum(TransactionStatus).optional(),
    eventId: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  });

  static readonly PAYMENT_PROOF: ZodType<PaymentProofRequest> = z.object({
    proofUrl: z.url('Invalid proof URL'),
  });
}
