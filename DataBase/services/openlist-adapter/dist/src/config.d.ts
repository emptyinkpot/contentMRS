export interface OpenListAdapterConfig {
    host: string;
    port: number;
    openlist: {
        baseUrl: string;
        token?: string;
        username?: string;
        passwordHash?: string;
    };
}
interface EnvSource {
    [key: string]: string | undefined;
}
export declare function resolveOpenListEnv(source?: EnvSource): EnvSource;
export declare function loadConfig(): OpenListAdapterConfig;
export {};
