import { Response, NextFunction } from 'express';
import { UserRequest } from '../types/user-request';
import { CreateTransactionRequest } from '../model/transaction-model';
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
}
