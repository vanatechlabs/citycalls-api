import { OUR_SERVICE_DEFAULTS, OUR_SERVICES_SECTION_DEFAULTS } from './ourServices.model';
import { createOurServiceSchema, updateOurServiceSchema, updateOurServicesSectionSchema } from './ourServices.validation';

describe('City Calls our services validation', () => {
  it('accepts every default card and the default heading', () => {
    for (const card of OUR_SERVICE_DEFAULTS) expect(createOurServiceSchema.safeParse(card).success).toBe(true);
    expect(updateOurServicesSectionSchema.safeParse(OUR_SERVICES_SECTION_DEFAULTS).success).toBe(true);
  });

  it('needs a name and a website path starting with /', () => {
    const base = OUR_SERVICE_DEFAULTS[0];
    expect(createOurServiceSchema.safeParse({ ...base, name: ' ' }).success).toBe(false);
    expect(createOurServiceSchema.safeParse({ ...base, path: 'services/ac' }).success).toBe(false);
  });

  it('takes an optional Navbar List service id', () => {
    const base = OUR_SERVICE_DEFAULTS[0];
    expect(createOurServiceSchema.safeParse({ ...base, navServiceId: '64b7f0c2a1b2c3d4e5f60718' }).success).toBe(true);
    expect(createOurServiceSchema.safeParse({ ...base, navServiceId: 'not-an-id' }).success).toBe(false);
  });

  it('rejects unsafe images and links', () => {
    expect(createOurServiceSchema.safeParse({ ...OUR_SERVICE_DEFAULTS[0], image: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateOurServicesSectionSchema.safeParse({ ...OUR_SERVICES_SECTION_DEFAULTS, buttonLink: 'javascript:x' }).success).toBe(false);
  });

  it('allows partial updates but not empty ones', () => {
    expect(updateOurServiceSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
    expect(updateOurServiceSchema.safeParse({}).success).toBe(false);
  });
});
