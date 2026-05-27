import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: validate-project-manifest.py <schema> <manifest>")
        return 2

    schema_path = Path(sys.argv[1])
    manifest_path = Path(sys.argv[2])

    schema = json.loads(schema_path.read_text(encoding="utf-8-sig"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))

    missing = [key for key in schema.get("required", []) if key not in manifest]
    if missing:
        print("project manifest schema failed")
        print("missing: " + ", ".join(missing))
        return 1

    properties = schema.get("properties", {})
    for key, rules in properties.items():
        if key not in manifest:
            continue
        value = manifest[key]
        expected_type = rules.get("type")
        if expected_type == "string" and not isinstance(value, str):
            print(f"project manifest schema failed: {key} must be string")
            return 1
        if expected_type == "array" and not isinstance(value, list):
            print(f"project manifest schema failed: {key} must be array")
            return 1
        if "enum" in rules and value not in rules["enum"]:
            print(f"project manifest schema failed: {key} must be one of {rules['enum']}")
            return 1

    print("project manifest schema ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
