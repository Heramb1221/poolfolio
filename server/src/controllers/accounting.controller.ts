import { Request, Response, NextFunction } from 'express';
import accountingService from '../services/accounting.service';
import { AccountingQuery } from '../middleware/accounting.validation';

export const getOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;

    const ownership = await accountingService.getOwnership(
      investmentId,
      requesterUserId
    );

    res.status(200).json({
      status: 'success',
      data: ownership,
    });
  } catch (error) {
    next(error);
  }
};

export const getPnL = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;
    const query = req.query as unknown as AccountingQuery;

    const pnl = await accountingService.getPnL(
      investmentId,
      requesterUserId,
      query?.currentPrice
    );

    res.status(200).json({
      status: 'success',
      data: pnl,
    });
  } catch (error) {
    next(error);
  }
};

export const getSettlements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;

    const settlements = await accountingService.getSettlements(
      investmentId,
      requesterUserId
    );

    res.status(200).json({
      status: 'success',
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
};

export const settleInvestment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;

    const settlements = await accountingService.settleInvestment(
      investmentId,
      requesterUserId
    );

    res.status(200).json({
      status: 'success',
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvestmentSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investmentId = req.params.investmentId;
    const requesterUserId = req.user!.id;
    const query = req.query as unknown as AccountingQuery;

    const summary = await accountingService.getInvestmentSummary(
      investmentId,
      requesterUserId,
      query?.currentPrice
    );

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
