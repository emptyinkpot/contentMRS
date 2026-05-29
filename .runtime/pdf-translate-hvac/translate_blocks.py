import json
import os
import re
import time
import urllib.request

ROOT = os.path.dirname(__file__)
BLOCKS_PATH = os.path.join(ROOT, "blocks.json")
CACHE_PATH = os.path.join(ROOT, "translations.json")
SECRET_PATH = r"C:\Users\ASUS-KL\.codex-secrets\sub2api\consumers\contentmrs-novel.env"


def load_secret():
    values = {}
    with open(SECRET_PATH, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"')
    return {
        "base_url": values.get("SUB2API_NOVEL_BASE_URL", "").rstrip("/"),
        "api_key": values.get("SUB2API_NOVEL_API_KEY", ""),
        "model": values.get("SUB2API_NOVEL_MODEL", values.get("CONTENTBASE_DEFAULT_MODEL", "gpt-5.5")),
    }


def load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}
    with open(CACHE_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_cache(cache):
    tmp = CACHE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, ensure_ascii=False, indent=2)
    os.replace(tmp, CACHE_PATH)


def normalize_text(text):
    text = re.sub(r"-\s+", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def call_translate(batch, config):
    items = [{"id": item["id"], "text": normalize_text(item["text"])} for item in batch]
    payload = {
        "model": config["model"],
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是严谨的科技论文英译中译者。只输出 JSON 数组。"
                    "逐项翻译 text 为中文，保留数学符号、变量、公式编号、文献编号如 [1]、图表编号如 Fig. 2 / Table I、"
                    "英文缩写如 HVAC、RL、LQR、MPC、NIST、IEEE。不要添加解释，不要改写为摘要。"
                    "作者姓名、机构名、邮箱、DOI 原样保留或只翻译普通说明词。"
                    "输出格式严格为 [{\"id\":数字,\"zh\":\"中文译文\"}]。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(items, ensure_ascii=False),
            },
        ],
    }
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        config["base_url"] + "/chat/completions",
        data=body,
        headers={
            "Authorization": "Bearer " + config["api_key"],
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        data = json.loads(response.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"].strip()
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)
    return json.loads(content)


def main():
    with open(BLOCKS_PATH, "r", encoding="utf-8") as handle:
        blocks = json.load(handle)
    cache = load_cache()
    config = load_secret()
    if not config["base_url"] or not config["api_key"]:
        raise RuntimeError("missing OpenAI-compatible translation config")
    targets = [item for item in blocks if item.get("translate") and str(item["id"]) not in cache]
    print(f"remaining={len(targets)} cached={len(cache)} model={config['model']}")
    batch_size = 6
    for offset in range(0, len(targets), batch_size):
        batch = targets[offset : offset + batch_size]
        for attempt in range(3):
            try:
                translated = call_translate(batch, config)
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                print(f"retry batch {offset}: {exc}")
                time.sleep(3 + attempt * 5)
        for item in translated:
            cache[str(item["id"])] = item["zh"]
        save_cache(cache)
        print(f"cached={len(cache)}")
        time.sleep(0.5)


if __name__ == "__main__":
    main()
