import { loadConfig } from "../dist/src/config.js";
import { OpenListClient } from "../dist/src/sdk/OpenListClient.js";

const config = loadConfig();
const client = new OpenListClient(config.openlist);

const ping = await client.health();
const storages = await client.listStorages(1, 50);
const summary = {
  ok: ping === "pong",
  openlist: ping,
  authMode: config.openlist.token ? "token" : config.openlist.username && config.openlist.passwordHash ? "login-hash" : "anonymous",
  storageCount: storages.total,
  storageMounts: storages.content.slice(0, 10).map((item) => item.mount_path)
};

console.log(JSON.stringify(summary, null, 2));
