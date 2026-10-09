import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { ForbiddenError } from '../lib/errors';
import { UserModel } from '../modules/users/users.model';

// Admin Section → Menu Access also blocks changes behind hidden menus: a user
// with a menu list can't POST/PUT/PATCH/DELETE on an API that belongs only to
// menus they weren't given. Keys are the admin sidebar's "<Section>::<Menu>";
// "<Section>::*" means any menu of that section. A request is allowed when
// the user has ANY of the listed keys. APIs not listed here (files, own
// profile, notifications, public…) are never blocked by this.
const API_MENUS: { prefix: string; keys: string[] }[] = [
  { prefix: '/websites/city-calls/home-page/hero-carousel', keys: ['Website Section::Hero Carousel'] },
  { prefix: '/websites/city-calls/home-page/offers', keys: ['Website Section::Offers & Promotions'] },
  { prefix: '/websites/city-calls/home-page/features', keys: ['Website Section::Features'] },
  { prefix: '/websites/city-calls/home-page/about', keys: ['Website Section::About'] },
  { prefix: '/websites/city-calls/home-page/popular-packages', keys: ['Website Section::Popular Packages'] },
  { prefix: '/websites/city-calls/home-page/our-services', keys: ['Website Section::Our Services'] },
  { prefix: '/websites/city-calls/home-page/counters', keys: ['Website Section::Counters'] },
  { prefix: '/websites/city-calls/home-page/faq', keys: ['Website Section::FAQ'] },
  { prefix: '/websites/city-calls/home-page/key-features', keys: ['Website Section::Why Choose Us'] },
  { prefix: '/websites/city-calls/home-page/how-it-works', keys: ['Website Section::How It Works'] },
  { prefix: '/websites/city-calls/about-page/hero', keys: ['Website Section::About Hero'] },
  { prefix: '/websites/city-calls/about-page/story', keys: ['Website Section::Our Story'] },
  { prefix: '/websites/city-calls/about-page/values', keys: ['Website Section::Our Values'] },
  { prefix: '/websites/city-calls/about-page/parallax', keys: ['Website Section::Parallax Image'] },
  { prefix: '/websites/city-calls/about-page/journey', keys: ['Website Section::Our Journey'] },
  { prefix: '/websites/city-calls/home-page/launch-spotlight', keys: ['Pages Section::Launch Spotlight'] },
  { prefix: '/websites/city-calls/home-page/testimonials', keys: ['Pages Section::Testimonials'] },
  { prefix: '/websites/city-calls/pages', keys: ['Pages Section::Add Page', 'Pages Section::Page List'] },
  { prefix: '/websites/city-calls/backgrounds', keys: ['Background Section::*'] },
  { prefix: '/websites/city-calls/blogs', keys: ['Blog Section::*'] },
  { prefix: '/websites/city-calls/seo', keys: ['SEO Section::SEO Manager'] },
  { prefix: '/websites/city-calls/social-links', keys: ['SEO Section::Social Media'] },
  { prefix: '/websites/city-calls/navbar', keys: ['Admin Section::Navbar List'] },
  { prefix: '/registrations', keys: ['Registration Section::*'] },
  { prefix: '/enquiries', keys: ['Enquiry Section::*'] },
  { prefix: '/masters', keys: ['Admin Section::Masters'] },
  { prefix: '/server-assets', keys: ['Admin Section::Server Management'] },
  { prefix: '/registration-number-settings', keys: ['Admin Section::Settings'] },
  { prefix: '/roles', keys: ['Admin Section::Roles & Permissions'] },
  { prefix: '/users', keys: ['Admin Section::Staff & Team Members', 'Admin Section::Roles & Permissions'] },
  { prefix: '/branches', keys: ['Organization::Branches'] },
  { prefix: '/sub-branches', keys: ['Organization::Sub-Branches'] },
  { prefix: '/teams', keys: ['Organization::Teams'] },
  { prefix: '/campaigns', keys: ['Communications::Campaigns'] },
  { prefix: '/notification-templates', keys: ['Communications::Templates'] },
  { prefix: '/ai/settings', keys: ['Analytics & Intelligence::AI Settings'] },
  { prefix: '/import', keys: ['System & Data::Import/Export', 'Leads::Bulk Import'] },
  { prefix: '/vendors', keys: ['Workforce::Vendors'] },
  { prefix: '/vendor-invoices', keys: ['Workforce::Vendors', 'Finance::*'] },
  { prefix: '/vendor-payouts', keys: ['Workforce::Vendors', 'Finance::*'] },
  { prefix: '/employees', keys: ['Workforce::Employees', 'Workforce::Availability'] },
  { prefix: '/services', keys: ['Catalog::Services', 'Beauty & Salon::Beauty Services'] },
  { prefix: '/happy-calls', keys: ['Quality Assurance::Happy Calls'] },
  { prefix: '/reopen-requests', keys: ['Quality Assurance::Reopen Requests', 'Operations::*'] },
  { prefix: '/complaints', keys: ['Quality Assurance::Complaints', 'Calls::*'] },
  // Shared by several screens (a call can create a lead / customer / request).
  { prefix: '/calls', keys: ['Calls::*'] },
  { prefix: '/leads', keys: ['Leads::*', 'Calls::*'] },
  { prefix: '/customers', keys: ['Customers::*', 'Beauty & Salon::Beauty Customers', 'Calls::*', 'Registration Section::*', 'Operations::*'] },
  { prefix: '/service-requests', keys: ['Operations::*', 'Beauty & Salon::Beauty Requests', 'Calls::*', 'Quality Assurance::*'] },
  { prefix: '/estimates', keys: ['Finance::*', 'Operations::*'] },
  { prefix: '/proforma-invoices', keys: ['Finance::*', 'Operations::*'] },
  { prefix: '/invoices', keys: ['Finance::*', 'Operations::*'] },
  { prefix: '/credit-notes', keys: ['Finance::*'] },
  { prefix: '/debit-notes', keys: ['Finance::*'] },
];

// The user's own things (FCM token, availability) stay open to everyone.
const ALWAYS_OPEN = ['/employees/me', '/customers/me'];
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function menusForApiPath(path: string): string[] | null {
  if (ALWAYS_OPEN.some((p) => matches(path, p))) return null;
  // Longest prefix wins (e.g. /ai/settings before a shorter /ai rule).
  const rule = API_MENUS.filter((r) => matches(path, r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return rule?.keys ?? null;
}

export function hasAnyMenu(allowed: string[], keys: string[]) {
  return keys.some((key) =>
    key.endsWith('::*') ? allowed.some((a) => a.startsWith(key.slice(0, -1))) : allowed.includes(key)
  );
}

// Short cache so every write doesn't hit the database for the user's list.
const CACHE_MS = 30_000;
const cache = new Map<string, { role: string; menuAccess?: string[]; at: number }>();

export function clearMenuAccessCache(userId: string) {
  cache.delete(userId);
}

async function loadAccess(userId: string) {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  const user = await UserModel.findById(userId).select('role menuAccess').lean();
  const entry = { role: user?.role ?? '', menuAccess: user?.menuAccess, at: Date.now() };
  cache.set(userId, entry);
  return entry;
}

export async function menuAccessGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!WRITE_METHODS.has(req.method)) return next();
    const keys = menusForApiPath(req.path);
    if (!keys) return next();

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(); // the route's own auth answers 401
    let userId: string;
    try {
      userId = verifyAccessToken(header.slice('Bearer '.length)).sub;
    } catch {
      return next();
    }

    const access = await loadAccess(userId);
    if (access.role === 'SUPER_ADMIN' || !Array.isArray(access.menuAccess)) return next();
    if (hasAnyMenu(access.menuAccess, keys)) return next();
    next(new ForbiddenError("You don't have access to this menu"));
  } catch (error) {
    next(error);
  }
}
