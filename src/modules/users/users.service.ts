import { UserModel } from './users.model';
import { CustomRoleModel } from './customRoles.model';
import { RolePermissionModel } from '../config/rolePermissions.model';
import { NotFoundError, ConflictError, ValidationError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { hashPassword } from '../auth/auth.service';
import { SessionModel } from '../auth/sessions.model';
import { ROLES, Role, UserStatus, DataScope } from './users.types';
import { loadPermissionCache } from '../../lib/permissionCache';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';

function humanizeRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function isBuiltInRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

// The single gate every role string passes through before it's written to a
// User or RolePermission document — accepts a built-in Role (users.types.ts)
// or an existing CustomRoleModel slug, rejects anything else with a proper
// field-level 422 rather than letting an arbitrary/typo'd string in.
async function assertValidRole(role: string): Promise<void> {
  if (isBuiltInRole(role)) return;
  const exists = await CustomRoleModel.exists({ slug: role.toUpperCase() });
  if (!exists) {
    throw new ValidationError([
      { field: 'role', code: 'UNKNOWN_ROLE', message: `"${role}" is not a recognized role. Create it first under Roles & Permissions.` },
    ]);
  }
}

function slugify(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function createCustomRole(data: { name: string; description?: string }, actor: AccessTokenPayload) {
  const slug = slugify(data.name);
  if (!slug) {
    throw new ValidationError([{ field: 'name', code: 'INVALID_NAME', message: 'Role name must contain at least one letter or number' }]);
  }
  if (isBuiltInRole(slug)) {
    throw new ConflictError('A built-in role with this name already exists', 'DUPLICATE_RECORD');
  }
  const existing = await CustomRoleModel.findOne({ slug });
  if (existing) throw new ConflictError('A role with this name already exists', 'DUPLICATE_RECORD');

  const created = await CustomRoleModel.create({
    slug,
    name: data.name,
    description: data.description,
    createdBy: actor.sub,
  });
  await logActivity({
    entityType: 'ROLE',
    entityId: created._id.toString(),
    user: actor,
    action: 'CREATED',
    module: 'users',
    newValue: { slug, name: data.name },
  });
  return created;
}

export async function deleteCustomRole(slug: string, actor: AccessTokenPayload) {
  const role = await CustomRoleModel.findOne({ slug });
  if (!role) throw new NotFoundError('Role not found');

  const inUse = await UserModel.exists({ role: slug });
  if (inUse) {
    throw new ConflictError('This role is still assigned to one or more staff accounts — reassign them first', 'ROLE_IN_USE');
  }

  await role.deleteOne();
  await RolePermissionModel.deleteMany({ role: slug });
  await loadPermissionCache();
  await logActivity({
    entityType: 'ROLE',
    entityId: role._id.toString(),
    user: actor,
    action: 'DELETED',
    module: 'users',
    oldValue: { slug, name: role.name },
  });
}

// Only custom roles (customRoles.model.ts) have a status to toggle — built-in
// roles (users.types.ts's ROLES) aren't DB documents, so there's no record
// here to flip; the frontend never sends this for a built-in role slug.
export async function updateCustomRoleStatus(slug: string, status: 'ACTIVE' | 'INACTIVE', actor: AccessTokenPayload) {
  const role = await CustomRoleModel.findOne({ slug });
  if (!role) throw new NotFoundError('Role not found');

  const oldStatus = role.status;
  if (oldStatus === status) return role;

  role.status = status;
  await role.save();
  await logActivity({
    entityType: 'ROLE',
    entityId: role._id.toString(),
    user: actor,
    action: 'UPDATED',
    module: 'users',
    oldValue: { status: oldStatus },
    newValue: { status },
  });
  return role;
}

interface PermissionActorOut {
  id: string;
  name: string;
}

interface PermissionRowOut {
  id: string;
  module: string;
  action: string;
  dataScope: DataScope;
  createdBy: PermissionActorOut | null;
  createdAt: Date | null;
  updatedBy: PermissionActorOut | null;
  updatedAt: Date | null;
}

// Roles themselves are a fixed enum (users.types.ts), not a DB collection —
// this lists that enum with each role's real permission grants aggregated
// from RolePermissionModel (the actual RBAC seed / runtime edits), rather
// than a hardcoded permission list that could drift from what's enforced.
// `editable: false` on SUPER_ADMIN — its own grants are protected from the
// runtime editor (already has ALL scope everywhere; editing/deleting these
// risks locking every admin out of the system).
export async function listRoles() {
  const grants = await RolePermissionModel.find()
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ module: 1, action: 1 })
    .lean();

  const permissionsByRole = new Map<string, PermissionRowOut[]>();
  for (const g of grants) {
    const createdBy = g.createdBy as unknown as { _id: { toString(): string }; name: string } | null;
    const updatedBy = g.updatedBy as unknown as { _id: { toString(): string }; name: string } | null;
    const list = permissionsByRole.get(g.role) ?? [];
    list.push({
      id: g._id.toString(),
      module: g.module,
      action: g.action,
      dataScope: g.dataScope,
      createdBy: createdBy ? { id: createdBy._id.toString(), name: createdBy.name } : null,
      createdAt: g.createdAt ?? null,
      updatedBy: updatedBy ? { id: updatedBy._id.toString(), name: updatedBy.name } : null,
      updatedAt: g.updatedAt ?? null,
    });
    permissionsByRole.set(g.role, list);
  }

  const builtIn = ROLES.map((role) => ({
    id: role as string,
    name: humanizeRole(role),
    description: '',
    editable: role !== 'SUPER_ADMIN',
    isCustom: false,
    status: 'ACTIVE' as const,
    permissions: permissionsByRole.get(role) ?? [],
  }));

  const customRoles = await CustomRoleModel.find().sort({ createdAt: 1 }).lean();
  const custom = customRoles.map((r) => ({
    id: r.slug,
    name: r.name,
    description: r.description ?? '',
    editable: true,
    isCustom: true,
    status: r.status ?? 'ACTIVE',
    permissions: permissionsByRole.get(r.slug) ?? [],
  }));

  return [...builtIn, ...custom];
}

export async function createRolePermission(
  role: string,
  data: { module: string; action: string; dataScope: DataScope },
  actor: AccessTokenPayload
) {
  if (role === 'SUPER_ADMIN') {
    throw new ConflictError('Super Admin permissions cannot be modified', 'SUPER_ADMIN_PROTECTED');
  }
  await assertValidRole(role);
  const existing = await RolePermissionModel.findOne({ role, module: data.module, action: data.action });
  if (existing) throw new ConflictError('This role already has a grant for that module/action', 'DUPLICATE_RECORD');

  const created = await RolePermissionModel.create({ ...data, role, createdBy: actor.sub });
  await loadPermissionCache();
  await logActivity({
    entityType: 'ROLE_PERMISSION',
    entityId: created._id.toString(),
    user: actor,
    action: 'CREATED',
    module: 'users',
    newValue: { role, module: data.module, action: data.action, dataScope: data.dataScope },
  });
  return created.populate('createdBy', 'name');
}

export async function updateRolePermission(id: string, dataScope: DataScope, actor: AccessTokenPayload) {
  const existing = await RolePermissionModel.findById(id);
  if (!existing) throw new NotFoundError('Permission not found');
  if (existing.role === 'SUPER_ADMIN') {
    throw new ConflictError('Super Admin permissions cannot be modified', 'SUPER_ADMIN_PROTECTED');
  }

  const fromScope = existing.dataScope;
  existing.dataScope = dataScope;
  existing.updatedBy = actor.sub as never;
  await existing.save();
  await loadPermissionCache();
  await logActivity({
    entityType: 'ROLE_PERMISSION',
    entityId: id,
    user: actor,
    action: 'UPDATED',
    module: 'users',
    oldValue: { dataScope: fromScope },
    newValue: { dataScope },
  });
  return existing.populate([
    { path: 'createdBy', select: 'name' },
    { path: 'updatedBy', select: 'name' },
  ]);
}

export async function deleteRolePermission(id: string, actor: AccessTokenPayload) {
  const existing = await RolePermissionModel.findById(id);
  if (!existing) throw new NotFoundError('Permission not found');
  if (existing.role === 'SUPER_ADMIN') {
    throw new ConflictError('Super Admin permissions cannot be modified', 'SUPER_ADMIN_PROTECTED');
  }

  await existing.deleteOne();
  await loadPermissionCache();
  await logActivity({
    entityType: 'ROLE_PERMISSION',
    entityId: id,
    user: actor,
    action: 'DELETED',
    module: 'users',
    oldValue: { role: existing.role, module: existing.module, action: existing.action, dataScope: existing.dataScope },
  });
}

interface ListParams {
  page: number;
  limit: number;
  role?: Role;
  branchId?: string;
  status?: UserStatus;
  q?: string;
}

export async function listUsers(params: ListParams) {
  const filter: Record<string, unknown> = {};
  if (params.role) filter.role = params.role;
  if (params.branchId) filter.branchId = params.branchId;
  if (params.status) filter.status = params.status;
  if (params.q) {
    filter.$or = [
      { name: { $regex: params.q, $options: 'i' } },
      { mobile: { $regex: params.q, $options: 'i' } },
      { email: { $regex: params.q, $options: 'i' } },
    ];
  }

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .skip(skip)
      .limit(params.limit)
      .sort({ createdAt: -1 }),
    UserModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

export async function getUser(id: string) {
  const user = await UserModel.findById(id).populate('createdBy', 'name').populate('updatedBy', 'name');
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function createUser(
  data: {
    name: string;
    email?: string;
    mobile: string;
    password: string;
    role: string;
    branchId?: string;
    subBranchId?: string;
    teamId?: string;
    vendorId?: string;
  },
  actorId: string
) {
  await assertValidRole(data.role);
  const existing = await UserModel.findOne({ mobile: data.mobile });
  if (existing) throw new ConflictError('A user with this mobile number already exists', 'DUPLICATE_RECORD');

  const passwordHash = await hashPassword(data.password);
  const created = await UserModel.create({
    name: data.name,
    email: data.email,
    mobile: data.mobile,
    passwordHash,
    role: data.role,
    branchId: data.branchId,
    subBranchId: data.subBranchId,
    teamId: data.teamId,
    vendorId: data.vendorId,
    createdBy: actorId,
  });
  return created.populate('createdBy', 'name');
}

export async function updateUser(id: string, data: Record<string, unknown>, actorId: string) {
  if (typeof data.role === 'string') {
    await assertValidRole(data.role);
  }
  const user = await UserModel.findByIdAndUpdate(
    id,
    { ...data, updatedBy: actorId },
    { new: true, runValidators: true }
  )
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');
  if (!user) throw new NotFoundError('User not found');

  // Deactivating a user revokes all their active sessions immediately.
  if (data.status === 'INACTIVE') {
    await SessionModel.updateMany({ userId: id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  }

  return user;
}

export async function deleteUser(id: string, actor: AccessTokenPayload) {
  if (id === actor.sub) {
    throw new ConflictError('You cannot delete your own account', 'SELF_DELETE_BLOCKED');
  }

  const user = await UserModel.findById(id);
  if (!user) throw new NotFoundError('User not found');

  await user.deleteOne();
  await SessionModel.updateMany({ userId: id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  await logActivity({
    entityType: 'USER',
    entityId: id,
    user: actor,
    action: 'DELETED',
    module: 'users',
    oldValue: { name: user.name, mobile: user.mobile, role: user.role },
  });
}
