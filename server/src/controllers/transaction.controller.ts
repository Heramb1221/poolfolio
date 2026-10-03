import { Request, Response, NextFunction } from 'express';
import transactionService from '../services/transaction.service';
import {
  CreateTransactionInput,
  GetTransactionsQuery,
  UpdateTransactionInput,
} from '../middleware/transaction.validation';

export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;
    const input: CreateTransactionInput = req.body;

    const transaction = await transactionService.createTransaction(
      investmentId,
      requesterUserId,
      input
    );

    res.status(201).json({
      status: 'success',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvestmentTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;
    const query = req.query as unknown as GetTransactionsQuery;

    const summary = await transactionService.getInvestmentTransactions(
      investmentId,
      requesterUserId,
      query
    );

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { investmentId, transactionId } = req.params;
    const requesterUserId = req.user!.id;

    const transaction = await transactionService.getTransactionById(
      investmentId,
      transactionId,
      requesterUserId
    );

    res.status(200).json({
      status: 'success',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { investmentId, transactionId } = req.params;
    const requesterUserId = req.user!.id;
    const input: UpdateTransactionInput = req.body;

    const transaction = await transactionService.updateTransaction(
      investmentId,
      transactionId,
      requesterUserId,
      input
    );

    res.status(200).json({
      status: 'success',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};
