import { hasAnyMenu, menusForApiPath } from './menuAccess.middleware';

describe('Menu access API guard', () => {
  it('maps admin APIs to the menus that own them', () => {
    expect(menusForApiPath('/websites/city-calls/home-page/hero-carousel/slides/abc')).toEqual(['Website Section::Hero Carousel']);
    expect(menusForApiPath('/registrations/123/transition')).toEqual(['Registration Section::*']);
    expect(menusForApiPath('/ai/settings')).toEqual(['Analytics & Intelligence::AI Settings']);
  });

  it('leaves unmapped and personal APIs open', () => {
    expect(menusForApiPath('/files/signed-upload')).toBeNull();
    expect(menusForApiPath('/employees/me/availability')).toBeNull();
    expect(menusForApiPath('/websites-other')).toBeNull();
  });

  it('allows when the user has any listed menu, including section wildcards', () => {
    const allowed = ['Registration Section::Home Appliance', 'Website Section::FAQ'];
    expect(hasAnyMenu(allowed, ['Registration Section::*'])).toBe(true);
    expect(hasAnyMenu(allowed, ['Website Section::Hero Carousel'])).toBe(false);
    expect(hasAnyMenu([], ['Calls::*'])).toBe(false);
  });
});
