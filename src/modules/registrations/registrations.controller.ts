import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../lib/apiResponse';
import { ScopedRequest } from '../../middleware/permission.middleware';
import * as registrationsService from './registrations.service';

export async function listRegistrationsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const result = await registrationsService.listRegistrations(req.query as never);
    sendSuccess(res, result, 'Registrations fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getRegistrationStatsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await registrationsService.getRegistrationStats(req.query as never);
    sendSuccess(res, stats, 'Registration stats fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function bulkDeleteRegistrationsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const result = await registrationsService.bulkDeleteRegistrations(req.body.ids);
    sendSuccess(res, result, `${result.deleted} registration(s) deleted successfully`);
  } catch (error) {
    next(error);
  }
}

export async function getRegistrationHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const registration = await registrationsService.getRegistration(paramAsString(req.params.id));
    sendSuccess(res, registration, 'Registration fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createRegistrationHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await registrationsService.resolveActor(req.user?.sub);
    const registration = await registrationsService.createRegistration(req.body, actor);
    sendSuccess(res, registration, 'Registration created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateRegistrationHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await registrationsService.resolveActor(req.user?.sub);
    const registration = await registrationsService.updateRegistration(paramAsString(req.params.id), req.body, actor);
    sendSuccess(res, registration, 'Registration updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function transitionRegistrationHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await registrationsService.resolveActor(req.user?.sub);
    const { status, note } = req.body as { status: 'ACTIVE' | 'COMPLETED'; note: string };
    const registration = await registrationsService.transitionRegistration(paramAsString(req.params.id), status, note, actor);
    sendSuccess(res, registration, `Registration moved to ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
}

export async function createWebsiteRegistrationHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const result = await registrationsService.createWebsiteRegistration(req.body);
    sendSuccess(res, result, 'Booking received successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadRegistrationsHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await registrationsService.getUnreadRegistrations(), 'Unread registrations fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function markRegistrationViewedHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await registrationsService.resolveActor(req.user?.sub);
    const registration = await registrationsService.markRegistrationViewed(paramAsString(req.params.id), actor);
    sendSuccess(res, registration, 'Registration marked as viewed');
  } catch (error) {
    next(error);
  }
}

export async function markRegistrationsViewedHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await registrationsService.resolveActor(req.user?.sub);
    const result = await registrationsService.markRegistrationsViewed(req.body.ids, actor);
    sendSuccess(res, result, 'Registrations marked as viewed');
  } catch (error) {
    next(error);
  }
}

export async function deleteRegistrationHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await registrationsService.deleteRegistration(paramAsString(req.params.id));
    sendSuccess(res, null, 'Registration deleted successfully');
  } catch (error) {
    next(error);
  }
}
