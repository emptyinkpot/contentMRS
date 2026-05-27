import { Hono } from "hono";
import type { OpenListClient } from "../sdk/OpenListClient.js";
interface AppVariables {
    requestId: string;
}
interface AppBindings {
    Variables: AppVariables;
}
export declare function createApp(client: OpenListClient): Hono<AppBindings, import("hono/types").BlankSchema, "/">;
export {};
