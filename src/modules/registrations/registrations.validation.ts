import { z } from 'zod';
import { ISSUE_FREQUENCIES, REGISTRATION_SOURCES, REGISTRATION_STATUSES } from './registration.model';

const optionalText = (max: number) => z.string().trim().max(max).optional();
const phoneSchema = z.string().trim().regex(/^\d{10}$/, 'Phone number must be 10 digits');
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const photoSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Photo must be an uploaded file path or an http(s) URL'
);

const registrationFields = {
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: phoneSchema,
  altPhone: z.union([phoneSchema, z.literal('')]).optional(),
  address: z.string().trim().min(1).max(300),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  language: optionalText(40),
  heardFrom: optionalText(60),
  referenceName: optionalText(120),
  instructions: optionalText(300),

  serviceId: objectIdSchema.optional(),
  serviceName: z.string().trim().min(1).max(150),
  serviceCategory: optionalText(120),

  brand: optionalText(80),
  modelNumber: optionalText(80),
  applianceType: optionalText(80),
  capacity: optionalText(80),
  issues: z.array(z.string().trim().min(1).max(80)).min(1, 'Select at least one issue').max(20),
  issueDescription: z.string().trim().min(1).max(500),
  photos: z.array(photoSchema).max(5).default([]),
  issueFrequency: z.enum(ISSUE_FREQUENCIES).optional(),
  safetyConcern: optionalText(80),

  preferredDate: z.coerce.date().optional(),
  timeSlot: optionalText(40),

  couponCode: optionalText(40),
  extraDetails: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(200),
  }).strict()).max(10).optional(),
};

export const createRegistrationSchema = z.object(registrationFields).strict();

// Website booking form (no login). The service is named by its page slug and
// resolved server-side against Navbar List; photos need an authenticated
// upload, so they aren't accepted here.
export const publicCreateRegistrationSchema = z.object(registrationFields)
  .omit({ serviceId: true, serviceName: true, serviceCategory: true, photos: true })
  .extend({
    serviceSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,120}$/, 'Invalid service'),
    // Shown if the slug isn't (yet) a Navbar List link.
    serviceName: z.string().trim().min(1).max(150),
  })
  .strict();

// Every field optional on update. photos is redeclared without its default so
// a partial update never wipes existing photos — it's also how the admin form
// attaches uploaded images once the new registration's id exists. Status is
// not editable here; it only moves through the transition endpoint.
export const updateRegistrationSchema = z.object(registrationFields).partial().extend({
  photos: z.array(photoSchema).max(5).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

// Moves a call to another status (which moves are allowed depends on its
// current status — checked by the service). Always with a note.
export const transitionRegistrationSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'REOPENED', 'CLOSED', 'CANCELLED']),
  note: z.string().trim().min(1, 'Please write a note').max(1000),
}).strict();

// YYYY-MM-DD, read as an India (IST) calendar day by the service.
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const registrationFilterFields = {
  q: z.string().trim().max(100).optional(),
  source: z.enum(REGISTRATION_SOURCES).optional(),
  serviceCategory: z.string().trim().max(120).optional(),
  serviceId: objectIdSchema.optional(),
  from: dayString.optional(),
  to: dayString.optional(),
};

export const listRegistrationsQuerySchema = z.object({
  ...registrationFilterFields,
  status: z.enum(REGISTRATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

// Same filters as the list minus status/paging — the stats cards and status
// tabs need counts across every status for the current filter.
export const registrationStatsQuerySchema = z.object(registrationFilterFields).strict();

// Rows shown on an admin list page — marked read when the page is opened.
export const markRegistrationsViewedSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
}).strict();

export const bulkDeleteRegistrationsSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
}).strict();
