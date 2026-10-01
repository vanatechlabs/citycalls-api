import { createSeoMetaSchema, publicSeoMetaQuerySchema, updateSeoMetaSchema } from './seoMeta.validation';

describe('City Calls SEO meta validation', () => {
  it('accepts a service page with valid JSON-LD and canonical', () => {
    const result = createSeoMetaSchema.safeParse({
      pagePath: '/services/ac-service',
      metaTitle: 'AC Repair in Ghaziabad',
      schemaMarkup: '{"@context":"https://schema.org","@type":"Service"}',
      canonicalUrl: 'https://citycalls.in/services/ac-service',
    });
    expect(result.success).toBe(true);
  });

  it('lowercases the page path', () => {
    expect(createSeoMetaSchema.parse({ pagePath: '/About' }).pagePath).toBe('/about');
  });

  it('rejects paths that are not site-relative', () => {
    expect(createSeoMetaSchema.safeParse({ pagePath: 'https://evil.test/' }).success).toBe(false);
    expect(publicSeoMetaQuerySchema.safeParse({ path: 'services' }).success).toBe(false);
  });

  it('accepts JSON-LD pasted with its <script> tag and stores only the JSON', () => {
    const parsed = createSeoMetaSchema.parse({
      pagePath: '/',
      schemaMarkup: '<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"WebSite"}\n</script>',
    });
    expect(parsed.schemaMarkup).toBe('{"@context":"https://schema.org","@type":"WebSite"}');
  });

  it('rejects invalid JSON-LD', () => {
    expect(createSeoMetaSchema.safeParse({ pagePath: '/', schemaMarkup: '{not json' }).success).toBe(false);
    expect(createSeoMetaSchema.safeParse({ pagePath: '/', schemaMarkup: '"just a string"' }).success).toBe(false);
  });

  it('requires canonical to be a full URL', () => {
    expect(createSeoMetaSchema.safeParse({ pagePath: '/', canonicalUrl: '/about' }).success).toBe(false);
    expect(createSeoMetaSchema.safeParse({ pagePath: '/', canonicalUrl: '' }).success).toBe(true);
  });

  it('does not allow changing the page on update', () => {
    expect(updateSeoMetaSchema.safeParse({ pagePath: '/contact' }).success).toBe(false);
    expect(updateSeoMetaSchema.safeParse({ metaTitle: 'New title' }).success).toBe(true);
  });
});
