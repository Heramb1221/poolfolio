import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import contributionService from '../services/contribution.service';
import { UnauthorizedError } from '../utils/errors';

/**
 * Create a new contribution for an investment.
 * Route: POST /api/investments/:investmentId/contributions
 */
export const createContribution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const contribution = await contributionService.createContribution(
    req.params.investmentId,
    req.user.id,
    req.body
  );

  res.status(201).json({
    success: true,
    data: { contribution },
  });
});

/**
 * Get all contributions and summary for an investment.
 * Route: GET /api/investments/:investmentId/contributions
 */
export const getContributions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const summary = await contributionService.getInvestmentContributions(
    req.params.investmentId,
    req.user.id,
    req.query
  );

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Get a specific contribution by ID.
 * Route: GET /api/investments/:investmentId/contributions/:contributionId
 */
export const getContribution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const contribution = await contributionService.getContributionById(
    req.params.investmentId,
    req.params.contributionId,
    req.user.id
  );

  res.status(200).json({
    success: true,
    data: { contribution },
  });
});

/**
 * Update an existing contribution.
 * Route: PATCH /api/investments/:investmentId/contributions/:contributionId
 */
export const updateContribution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const contribution = await contributionService.updateContribution(
    req.params.investmentId,
    req.params.contributionId,
    req.user.id,
    req.body
  );

  res.status(200).json({
    success: true,
    data: { contribution },
  });
});

/**
 * Delete / cancel an existing contribution.
 * Route: DELETE /api/investments/:investmentId/contributions/:contributionId
 */
export const deleteContribution = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  await contributionService.deleteContribution(
    req.params.investmentId,
    req.params.contributionId,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Contribution cancelled successfully',
  });
});
