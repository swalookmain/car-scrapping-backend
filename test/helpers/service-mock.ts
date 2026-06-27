/**
 * Returns a proxy that auto-mocks any service method with jest.fn().mockResolvedValue({}).
 */
export function createServiceMock(): Record<string, jest.Mock> {
  const fns: Record<string, jest.Mock> = {};
  return new Proxy(fns, {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      if (!fns[prop]) {
        fns[prop] = jest.fn().mockResolvedValue({});
      }
      return fns[prop];
    },
  });
}
