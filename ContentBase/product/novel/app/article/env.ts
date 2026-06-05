export const env = {
  llm: {
    baseUrl: read('CONTENTBASE_LLM_BASE_URL'),
    apiKey: read('CONTENTBASE_LLM_API_KEY'),
    model: read('CONTENTBASE_LLM_MODEL'),
  },
  gateway: {
    url: read('DATABASE_GATEWAY_URL'),
    apiKey: read('DATABASE_GATEWAY_API_KEY'),
    header: read('DATABASE_GATEWAY_HEADER') || 'X-DataBase-Api-Key',
  },
  reranker: {
    apiKey: read('DASHSCOPE_API_KEY'),
    baseUrl: read('DASHSCOPE_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: read('DASHSCOPE_EMBEDDING_MODEL'),
  },
  runtime: {
    port: Number(process.env.CONTENTBASE_CONSOLE_PORT || '5101'),
    apiKey: read('CONTENTBASE_API_KEY'),
    styleQueries: read('CONTENTBASE_STYLE_QUERIES'),
  },
};

function read(key: string): string {
  return String(process.env[key] || '').trim();
}
