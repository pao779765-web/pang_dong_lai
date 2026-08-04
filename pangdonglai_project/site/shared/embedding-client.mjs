export const DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT =
  "https://tokenhub.tencentmaas.com/v1/embeddings";
export const DEFAULT_TOKENHUB_EMBEDDING_MODEL = "kinfra-text-embedding-0.6b";

const MAX_BATCH_SIZE = 128;
const MAX_TEXT_LENGTH = 2000;

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function validateInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("向量输入必须是非空文本数组。");
  }
  if (inputs.length > MAX_BATCH_SIZE) {
    throw new Error(`单批向量输入不能超过 ${MAX_BATCH_SIZE} 条。`);
  }

  return inputs.map((input, index) => {
    if (typeof input !== "string" || !input.trim()) {
      throw new Error(`第 ${index + 1} 条向量输入不是有效文本。`);
    }
    const normalized = input.trim();
    if (normalized.length > MAX_TEXT_LENGTH) {
      throw new Error(`第 ${index + 1} 条向量输入超过 ${MAX_TEXT_LENGTH} 个字符。`);
    }
    return normalized;
  });
}

function validateVectors(payload, expectedCount) {
  if (!Array.isArray(payload?.data) || payload.data.length !== expectedCount) {
    throw new Error("向量服务返回数量与请求数量不一致。");
  }

  const ordered = [...payload.data].sort((left, right) => left.index - right.index);
  const vectors = ordered.map((item, index) => {
    if (item.index !== index || !Array.isArray(item.embedding) || item.embedding.length === 0) {
      throw new Error("向量服务返回了无效的索引或空向量。");
    }
    if (!item.embedding.every(Number.isFinite)) {
      throw new Error("向量服务返回了非有限数值。");
    }
    return item.embedding;
  });

  const dimensions = vectors[0].length;
  if (!vectors.every((vector) => vector.length === dimensions)) {
    throw new Error("向量服务返回的维度不一致。");
  }
  return vectors;
}

export function createTokenHubEmbeddingClient(options = {}) {
  const apiKey = options.apiKey?.trim();
  const endpoint = options.endpoint ?? DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT;
  const model = options.model ?? DEFAULT_TOKENHUB_EMBEDDING_MODEL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxRetries = options.maxRetries ?? 3;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? 1_000;

  if (!apiKey) throw new Error("缺少 TENCENT_TOKENHUB_API_KEY。");
  if (typeof fetchImpl !== "function") throw new Error("当前运行环境不支持 fetch。");

  return {
    endpoint,
    model,
    async embed(inputs) {
      const normalizedInputs = validateInputs(inputs);
      const body = JSON.stringify({
        model,
        input: normalizedInputs,
        encoding_format: "float",
      });

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body,
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (response.ok) {
            return validateVectors(await response.json(), normalizedInputs.length);
          }

          const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
          const retryable = response.status === 429 || response.status >= 500;
          if (!retryable || attempt === maxRetries) {
            throw new Error(`向量服务请求失败（HTTP ${response.status}）：${detail || "无错误详情"}`);
          }
        } catch (error) {
          const retryableNetworkError =
            error instanceof Error &&
            (error.name === "AbortError" || error.name === "TimeoutError" || error instanceof TypeError);
          if (!retryableNetworkError || attempt === maxRetries) throw error;
        }

        await wait(retryBaseDelayMs * 2 ** attempt);
      }

      throw new Error("向量服务请求未产生结果。");
    },
  };
}
