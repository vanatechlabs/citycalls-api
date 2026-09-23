import { Response, NextFunction } from 'express';
import * as userService from './users.service';
import { sendSuccess, paramAsString } from '../../lib/apiResponse';
import { ScopedRequest } from '../../middleware/permission.middleware';
import { UnauthorizedError } from '../../lib/errors';

export async function listUsersHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const { items, meta } = await userService.listUsers(req.query as never);
    // Never return passwordHash — the schema already excludes it via `select: false`,
    // this is a defense-in-depth strip in case a future query opts it back in.
    const safeItems = items.map((u) => {
      const obj = u.toObject();
      delete (obj as { passwordHash?: string }).passwordHash;
      return obj;
    });
    sendSuccess(res, safeItems, 'Users fetched successfully', meta);
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(paramAsString(req.params.id));
    sendSuccess(res, user, 'User fetched successfully');
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const user = await userService.createUser(req.body, req.user.sub);
    const obj = user.toObject();
    delete (obj as { passwordHash?: string }).passwordHash;
    sendSuccess(res, obj, 'User created successfully', null, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const user = await userService.updateUser(paramAsString(req.params.id), req.body, req.user.sub);
    sendSuccess(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    await userService.deleteUser(paramAsString(req.params.id), req.user);
    sendSuccess(res, null, 'Staff account deleted successfully');
  } catch (err) {
    next(err);
  }
}

export async function listRolesHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const roles = await userService.listRoles();
    sendSuccess(res, roles, 'Roles fetched successfully');
  } catch (err) {
    next(err);
  }
}

export async function createCustomRoleHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const role = await userService.createCustomRole(req.body, req.user);
    sendSuccess(res, role, 'Role created successfully', null, 201);
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomRoleHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    await userService.deleteCustomRole(paramAsString(req.params.role), req.user);
    sendSuccess(res, null, 'Role deleted successfully');
  } catch (err) {
    next(err);
  }
}

export async function updateCustomRoleStatusHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const role = await userService.updateCustomRoleStatus(paramAsString(req.params.role), req.body.status, req.user);
    sendSuccess(res, role, 'Role status updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function createRolePermissionHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const permission = await userService.createRolePermission(paramAsString(req.params.role), req.body, req.user);
    sendSuccess(res, permission, 'Permission granted successfully', null, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateRolePermissionHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const permission = await userService.updateRolePermission(paramAsString(req.params.id), req.body.dataScope, req.user);
    sendSuccess(res, permission, 'Permission updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteRolePermissionHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    await userService.deleteRolePermission(paramAsString(req.params.id), req.user);
    sendSuccess(res, null, 'Permission removed successfully');
  } catch (err) {
    next(err);
  }
}
