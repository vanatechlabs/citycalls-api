import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../middleware/permission.middleware';
import * as navbarService from './navbar.service';

// ── Menus ──────────────────────────────────────────────────────────────────

export async function listNavbarMenusHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const menus = await navbarService.listNavbarMenus();
    sendSuccess(res, menus, 'Navbar menus fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getNavbarMenuHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const menu = await navbarService.getNavbarMenu(paramAsString(req.params.menuId));
    sendSuccess(res, menu, 'Navbar menu fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createNavbarMenuHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const menu = await navbarService.createNavbarMenu(req.body);
    sendSuccess(res, menu, 'Navbar menu created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateNavbarMenuHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const menu = await navbarService.updateNavbarMenu(paramAsString(req.params.menuId), req.body);
    sendSuccess(res, menu, 'Navbar menu updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteNavbarMenuHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await navbarService.deleteNavbarMenu(paramAsString(req.params.menuId));
    sendSuccess(res, null, 'Navbar menu deleted successfully');
  } catch (error) {
    next(error);
  }
}

// ── Services (per-menu navlinks) ─────────────────────────────────────────

export async function listNavbarServicesHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const services = await navbarService.listNavbarServices(paramAsString(req.params.menuId));
    sendSuccess(res, services, 'Navlinks fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createNavbarServiceHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const service = await navbarService.createNavbarService(req.body);
    sendSuccess(res, service, 'Navlink created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateNavbarServiceHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const service = await navbarService.updateNavbarService(paramAsString(req.params.id), req.body);
    sendSuccess(res, service, 'Navlink updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteNavbarServiceHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await navbarService.deleteNavbarService(paramAsString(req.params.id));
    sendSuccess(res, null, 'Navlink deleted successfully');
  } catch (error) {
    next(error);
  }
}

// ── Public (website navbar) ──────────────────────────────────────────────

export async function listPublicNavbarMenusHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const menus = await navbarService.listPublicNavbarMenus();
    // Navbar content is CMS-managed and should reflect admin changes on the
    // next website request instead of being retained by a browser or proxy.
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, menus, 'Navbar menus fetched successfully');
  } catch (error) {
    next(error);
  }
}
