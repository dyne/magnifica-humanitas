/** Rejected requests are evicted only from their own locale/resource slot. */
export function createLocaleLoader(loaders) {
  const caches = new Map();
  let generation = 0;
  function load(locale, resource) {
    const key = `${locale}:${resource}`;
    if (!loaders[locale]?.[resource]) return Promise.reject(new Error(`Unavailable locale resource ${key}`));
    if (!caches.has(key)) {
      const request = Promise.resolve().then(() => loaders[locale][resource]()).then(module => module.default ?? module).catch(error => {
        if (caches.get(key) === request) caches.delete(key);
        throw error;
      });
      caches.set(key, request);
    }
    return caches.get(key);
  }
  async function activate(locale, publish) {
    const token = ++generation;
    try {
      const [library, messages] = await Promise.all([load(locale, 'library'), load(locale, 'messages')]);
      if (token !== generation) return false;
      publish({ library, messages, locale });
      return true;
    } catch (error) { if (token !== generation) return false; throw error; }
  }
  return { load, activate, cancelActivation: () => { generation++; } };
}
