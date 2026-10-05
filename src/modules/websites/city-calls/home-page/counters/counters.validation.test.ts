import { COUNTERS_DEFAULTS } from './counters.model';
import { updateCountersSchema } from './counters.validation';

describe('City Calls home counters validation', () => {
  it('accepts the bundled defaults and keeps decimals and suffix spaces', () => {
    const parsed = updateCountersSchema.parse(COUNTERS_DEFAULTS);
    expect(parsed.items[3].value).toBe(4.8);
    expect(parsed.items[2].suffix).toBe(' min');
  });

  it('needs a label and a non-negative number on every counter', () => {
    const [first] = COUNTERS_DEFAULTS.items;
    expect(updateCountersSchema.safeParse({ ...COUNTERS_DEFAULTS, items: [{ ...first, label: ' ' }] }).success).toBe(false);
    expect(updateCountersSchema.safeParse({ ...COUNTERS_DEFAULTS, items: [{ ...first, value: -1 }] }).success).toBe(false);
  });

  it('keeps between one and four counters', () => {
    expect(updateCountersSchema.safeParse({ ...COUNTERS_DEFAULTS, items: [] }).success).toBe(false);
    const five = Array.from({ length: 5 }, () => COUNTERS_DEFAULTS.items[0]);
    expect(updateCountersSchema.safeParse({ ...COUNTERS_DEFAULTS, items: five }).success).toBe(false);
  });

  it('rejects unsafe images and unknown icons', () => {
    const [first] = COUNTERS_DEFAULTS.items;
    expect(updateCountersSchema.safeParse({ items: [{ ...first, image: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(updateCountersSchema.safeParse({ items: [{ ...first, icon: 'rocket' }] }).success).toBe(false);
  });
});
