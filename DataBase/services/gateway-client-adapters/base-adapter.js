import { DataBaseGatewayClient } from "../../apps/gateway/src/clients/database-gateway-client.js";

export class DataBaseGatewayAdapter {
  constructor(options = {}) {
    this.client = new DataBaseGatewayClient(options);
  }
}
