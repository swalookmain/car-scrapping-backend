import {
  sanitizeStaffModules,
  STAFF_ASSIGNABLE_MODULE_IDS,
  APP_MODULES,
  permissionCatalog,
} from './app-modules';

describe('sanitizeStaffModules', () => {
  it('returns empty for non-arrays', () => {
    expect(sanitizeStaffModules(undefined)).toEqual([]);
    expect(sanitizeStaffModules('yard')).toEqual([]);
  });

  it('drops unknown and non-assignable ids', () => {
    expect(
      sanitizeStaffModules(['yard', 'staff', 'not-a-module', APP_MODULES.ACCOUNTING.id]),
    ).toEqual(['yard']);
  });

  it('deduplicates', () => {
    expect(sanitizeStaffModules(['yard', 'yard', 'leads'])).toEqual([
      'yard',
      'leads',
    ]);
  });

  it('only allows assignable ids', () => {
    const result = sanitizeStaffModules(STAFF_ASSIGNABLE_MODULE_IDS);
    expect(result).toEqual(STAFF_ASSIGNABLE_MODULE_IDS);
  });

  it('includes lifting as staff-assignable', () => {
    expect(STAFF_ASSIGNABLE_MODULE_IDS).toContain(APP_MODULES.LIFTING.id);
  });
});

describe('permissionCatalog', () => {
  it('lists every APP_MODULES entry including lifting', () => {
    const ids = permissionCatalog().map((m) => m.id);
    expect(ids).toEqual(Object.values(APP_MODULES).map((m) => m.id));
    expect(ids).toContain(APP_MODULES.LIFTING.id);
    expect(
      permissionCatalog().find((m) => m.id === APP_MODULES.LIFTING.id),
    ).toMatchObject({
      label: 'Lifting Vehicles',
      assignableToStaff: true,
    });
  });
});
