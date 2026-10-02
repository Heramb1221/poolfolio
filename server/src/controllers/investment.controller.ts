import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import investmentService from '../services/investment.service';
import { UnauthorizedError } from '../utils/errors';

/**
 * Create a new investment within a group.
 * Route: POST /api/groups/:groupId/investments
 */
export const createInvestment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const investment = await investmentService.createInvestment(
    req.params.groupId,
    req.user.id,
    req.body
  );

  res.status(201).json({
    success: true,
    data: { investment },
  });
});

/**
 * Get all investments belonging to a group.
 * Route: GET /api/groups/:groupId/investments
 */
export const getGroupInvestments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const investments = await investmentService.getGroupInvestments(
    req.params.groupId,
    req.user.id,
    req.query
  );

  res.status(200).json({
    success: true,
    data: { investments },
  });
});

/**
 * Get single investment details.
 * Route: GET /api/investments/:investmentId
 */
export const getInvestment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const investment = await investmentService.getInvestmentById(
    req.params.investmentId,
    req.user.id
  );

  res.status(200).json({
    success: true,
    data: { investment },
  });
});

/**
 * Update investment details and/or lifecycle status.
 * Route: PATCH /api/investments/:investmentId
 */
export const updateInvestment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const investment = await investmentService.updateInvestment(
    req.params.investmentId,
    req.user.id,
    req.body
  );

  res.status(200).json({
    success: true,
    data: { investment },
  });
});

/**
 * Delete an eligible investment.
 * Route: DELETE /api/investments/:investmentId
 */
export const deleteInvestment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  await investmentService.deleteInvestment(
    req.params.investmentId,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Investment deleted successfully',
  });
});
