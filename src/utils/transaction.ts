import { TransactionStatus } from '../generated/prisma/enums';

export function canBeRejected(status: TransactionStatus): boolean {
  return (
    status === TransactionStatus.WAITING_PAYMENT ||
    status === TransactionStatus.WAITING_CONFIRMATION
  );
}
