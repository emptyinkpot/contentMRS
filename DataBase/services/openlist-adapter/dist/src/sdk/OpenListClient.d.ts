export interface OpenListClientConfig {
    baseUrl: string;
    token?: string;
    username?: string;
    passwordHash?: string;
    fetchImpl?: typeof fetch;
}
export interface OpenListEnvelope<T> {
    code: number;
    message: string;
    data: T;
}
export interface OpenListStorage {
    id: number;
    mount_path: string;
    order: number;
    driver: string;
    cache_expiration: number;
    status: string;
    addition?: string;
    remark?: string;
    disabled?: boolean;
    [key: string]: unknown;
}
export interface OpenListPage<T> {
    content: T[];
    total: number;
}
export interface OpenListFileObject {
    name: string;
    size: number;
    is_dir: boolean;
    modified: string;
    created: string;
    sign?: string;
    thumb?: string;
    type?: number;
    hashinfo?: string;
    hash_info?: Record<string, string>;
    [key: string]: unknown;
}
export interface OpenListFsListRequest {
    path: string;
    password?: string;
    page?: number;
    per_page?: number;
    refresh?: boolean;
}
export interface OpenListFsListResponse {
    content: OpenListFileObject[];
    total: number;
    readme?: string;
    header?: string;
    write?: boolean;
    write_content_bypass?: boolean;
    provider?: string;
    direct_upload_tools?: string[];
}
export interface OpenListFsGetRequest {
    path: string;
    password?: string;
}
export declare class OpenListHttpError extends Error {
    readonly status: number;
    readonly body: string;
    constructor(status: number, body: string);
}
export declare class OpenListApiError extends Error {
    readonly code: number;
    constructor(code: number, message: string);
}
export declare class OpenListClient {
    private baseUrl;
    private readonly fetchImpl;
    private token?;
    private readonly username?;
    private readonly passwordHash?;
    constructor(config: OpenListClientConfig);
    health(): Promise<"pong">;
    private extractOpenListBasePath;
    private withBasePath;
    loginHash(username?: string | undefined, passwordHash?: string | undefined): Promise<string>;
    listStorages(page?: number, perPage?: number): Promise<OpenListPage<OpenListStorage>>;
    getStorage(id: number): Promise<OpenListStorage>;
    listFiles(input: OpenListFsListRequest): Promise<OpenListFsListResponse>;
    getFile(input: OpenListFsGetRequest): Promise<OpenListFileObject>;
    private request;
}
