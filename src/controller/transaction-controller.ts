import { Response, NextFunction } from 'express';
import { UserRequest } from '../types/user-request';
import {
  CreateTransactionRequest,
  PaymentProofRequest,
} from '../model/transaction-model';
import { Validation } from '../validations/validation';
import { TransactionValidation } from '../validations/transaction-validation';
import { TransactionService } from '../service/transaction-service';

export class TransactionController {
  // Create transaction (POST /api/transactions)
  static async create(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const request = Validation.validate<CreateTransactionRequest>(
        TransactionValidation.CREATE,
        req.body,
      );
      const response = await TransactionService.createTransaction(
        req.user!,
        request,
      );
      res.status(201).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload payment proof (POST /api/transactions/:id/upload-proof)
  static async uploadProof(
    req: UserRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const request = Validation.validate<PaymentProofRequest>(
        TransactionValidation.PAYMENT_PROOF,
        req.body,
      );
      const response = await TransactionService.uploadPaymentProof(
        req.user!,
        id,
        request,
      );
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Accept transaction (PATCH /api/transactions/:id/accept)
  static async accept(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const response = await TransactionService.acceptTransaction(
        req.user!,
        id,
      );
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
