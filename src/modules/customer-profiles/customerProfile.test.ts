import { listQuerySchema, searchQuerySchema } from './customerProfile.routes';
import { customerKind, dateRangeFilter, monthKey, parseSearch } from './customerProfile.service';
import { formatCustomerCode, normalizePhone } from './customerProfile.sync';

describe('Customer profiles', () => {
  it('reads a mobile number however it was typed', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    // Not an Indian mobile → no profile.
    expect(normalizePhone('12345')).toBe('');
    expect(normalizePhone('1234567890')).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });

  it('numbers customers CC-000001 onwards', () => {
    expect(formatCustomerCode(1)).toBe('CC-000001');
    expect(formatCustomerCode(4321)).toBe('CC-004321');
  });

  it('labels customers by how many services they had', () => {
    expect(customerKind(0)).toBe('NEW');
    expect(customerKind(1)).toBe('FIRST_TIME');
    expect(customerKind(3)).toBe('REPEAT');
    expect(customerKind(5)).toBe('LOYAL');
  });

  it('treats a typed number as a mobile search, and words as text', () => {
    expect(parseSearch('+91 98765').phonePart).toBe('98765');
    expect(parseSearch('0987654').phonePart).toBe('0987654');
    expect(parseSearch('98765 43210').phonePart).toBe('9876543210');
    expect(parseSearch('+91 9876543210').phonePart).toBe('9876543210');
    expect(parseSearch('Rahul').phonePart).toBe('');
    expect(parseSearch('CC2026100705').phonePart).toBe('');
    expect(parseSearch('123').phonePart).toBe('');
  });

  it('escapes regex characters so a search can never break the query', () => {
    const { rx } = parseSearch('a.b(c)*');
    expect(rx.test('a.b(c)*')).toBe(true);
    expect(rx.test('axb')).toBe(false);
  });

  it('groups by month in India time', () => {
    // 31 Aug 2026, 20:00 UTC is already 1 Sept in India.
    expect(monthKey(new Date('2026-08-31T20:00:00Z'))).toBe('2026-09');
    expect(monthKey(new Date('2026-08-31T10:00:00Z'))).toBe('2026-08');
  });

  it('validates the search box and list query', () => {
    expect(searchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
    expect(searchQuerySchema.parse({ q: '  9876  ' })).toEqual({ q: '9876' });
    expect(listQuerySchema.parse({})).toEqual({ page: 1, limit: 20, sort: 'recent', dateField: 'lastSeenAt' });
    expect(listQuerySchema.parse({ page: '3', limit: '50', sort: 'name' })).toEqual({ page: 3, limit: 50, sort: 'name', dateField: 'lastSeenAt' });
    expect(listQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('filters by a custom date range of whole India days', () => {
    expect(listQuerySchema.parse({ from: '2026-10-01', to: '2026-10-15' })).toMatchObject({ from: '2026-10-01', to: '2026-10-15', dateField: 'lastSeenAt' });
    expect(listQuerySchema.safeParse({ from: '2026-10-15', to: '2026-10-01' }).success).toBe(false);
    expect(listQuerySchema.safeParse({ from: '15-10-2026' }).success).toBe(false);
    expect(dateRangeFilter()).toBeNull();
    expect(dateRangeFilter('2026-10-01', '2026-10-01')).toEqual({
      $gte: new Date('2026-09-30T18:30:00.000Z'),
      $lte: new Date('2026-10-01T18:29:59.999Z'),
    });
  });
});
