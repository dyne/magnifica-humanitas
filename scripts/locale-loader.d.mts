export function createLocaleLoader(loaders: Record<string, Record<string, () => Promise<unknown>>>): {
 cancelActivation(): void;
 load(locale: string, resource: string): Promise<unknown>;
 activate(locale: string, publish: (value: { locale: string; library: unknown; messages: unknown }) => void): Promise<boolean>;
};
