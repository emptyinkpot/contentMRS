import { DataBaseGatewayAdapter } from "./base-adapter.js";

export class MyBlogDataBaseAdapter extends DataBaseGatewayAdapter {
  getGatewayStatus() {
    return this.client.status();
  }

  listWorks(limit = 50) {
    return this.client.listWorks(limit);
  }

  listChapters(workId, limit = 200) {
    return this.client.listChapters(workId, limit);
  }

  searchVocabulary(query, limit = 20) {
    return this.client.searchVocabulary(query, limit);
  }

  creativeStyleContract(protocol) {
    return this.client.creativeStyleContract(protocol);
  }

  searchKnowledge(query, limit = 10) {
    return this.client.search(query, limit);
  }

  createWork(payload, idempotencyKey) {
    return this.client.createWork(payload, idempotencyKey);
  }

  appendChapter(payload, idempotencyKey) {
    return this.client.appendChapter(payload, idempotencyKey);
  }

  upsertVocabularyItem(payload, idempotencyKey) {
    return this.client.upsertVocabularyItem(payload, idempotencyKey);
  }

  recordNote(payload, idempotencyKey) {
    return this.client.recordNote(payload, idempotencyKey);
  }

  recordExperience(payload, idempotencyKey) {
    return this.client.recordExperience(payload, idempotencyKey);
  }
}
