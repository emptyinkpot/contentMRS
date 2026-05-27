import { DataBaseGatewayAdapter } from "./base-adapter.js";

export class MortisDataBaseAdapter extends DataBaseGatewayAdapter {
  getRuntimeStatus() {
    return this.client.status();
  }

  getInventoryTables() {
    return this.client.inventoryTables();
  }

  search(query, limit = 10) {
    return this.client.search(query, limit);
  }

  health() {
    return this.client.health();
  }
}
