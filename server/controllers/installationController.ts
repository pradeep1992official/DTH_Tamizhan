import { Request, Response } from 'express';
import { createInstallationRequest } from '../models/installationRequestModel';

export function submitInstallationRequest(req: Request, res: Response): void {
  try {
    const request = createInstallationRequest(req.body);
    res.status(201).json({
      success: true,
      request: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error('[API Error] /api/installation-requests failed:', error);
    res.status(500).json({ success: false, error: 'Unable to save the installation request. Please try again.' });
  }
}
