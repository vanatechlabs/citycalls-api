import { createBlogSchema, updateBlogSchema } from './blogs.validation';
import { cleanBlogHtml, readingMinutes } from './blogs.service';

const valid = {
  title: 'AC Service Tips',
  slug: 'ac-service-tips',
  excerpt: 'Five easy ways to keep your AC cool all summer.',
  content: '<p>Clean the filter.</p>',
  category: 'Home Appliance',
};

describe('Blog validation', () => {
  it('accepts the required fields and fills in defaults', () => {
    expect(createBlogSchema.parse(valid)).toMatchObject({ status: 'DRAFT', featured: false, author: 'CityCalls Team', schemaMarkup: '' });
  });

  it('needs a clean URL slug', () => {
    expect(createBlogSchema.safeParse({ ...valid, slug: 'AC Service Tips' }).success).toBe(false);
    expect(createBlogSchema.safeParse({ ...valid, slug: 'ac--tips' }).success).toBe(false);
    expect(createBlogSchema.parse({ ...valid, slug: 'AC-Tips-2026' }).slug).toBe('ac-tips-2026');
  });

  it('stores schema markup as JSON (script tag stripped) and rejects broken JSON', () => {
    const parsed = createBlogSchema.parse({ ...valid, schemaMarkup: '<script type="application/ld+json">{"@type":"Article"}</script>' });
    expect(parsed.schemaMarkup).toBe('{"@type":"Article"}');
    expect(createBlogSchema.safeParse({ ...valid, schemaMarkup: '{not json' }).success).toBe(false);
  });

  it('canonical must be a full URL; unknown fields rejected', () => {
    expect(createBlogSchema.safeParse({ ...valid, canonicalTag: 'citycalls.in/blogs' }).success).toBe(false);
    expect(createBlogSchema.safeParse({ ...valid, views: 10 }).success).toBe(false);
  });

  it('partial update does not reset other fields', () => {
    expect(updateBlogSchema.parse({ status: 'PUBLISHED' })).toEqual({ status: 'PUBLISHED' });
    expect(updateBlogSchema.safeParse({}).success).toBe(false);
  });
});

describe('Blog content cleaning', () => {
  it('keeps editor formatting but drops scripts and event handlers', () => {
    const html = '<p style="text-align: center">Hi <strong>there</strong> <font color="#ff0000">red</font></p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a>';
    const clean = cleanBlogHtml(html);
    expect(clean).toContain('<p style="text-align:center">');
    expect(clean).toContain('<strong>there</strong>');
    expect(clean).toContain('<font color="#ff0000">red</font>');
    expect(clean).not.toMatch(/script|onerror|javascript:|<img/i);
  });

  it('estimates reading time from the text', () => {
    expect(readingMinutes('<p>short</p>')).toBe(1);
    expect(readingMinutes(`<p>${'word '.repeat(600)}</p>`)).toBe(3);
  });
});
