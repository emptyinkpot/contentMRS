const SENSITIVE_TABLES = new Set([
  "personal_secret_entries",
  "imported_accounts",
  "imported_browser_cookies",
  "fanqie_account_sessions",
  "fanqie_accounts",
  "olib_accounts",
  "mortis_napcat_accounts"
]);

const SENSITIVE_NAME_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /cookie/i,
  /credential/i,
  /session/i
];

export function isSensitiveTable(name: string): boolean {
  if (SENSITIVE_TABLES.has(name)) return true;
  return SENSITIVE_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

export function visibilityForTable(name: string): "allowed" | "hidden" {
  return isSensitiveTable(name) ? "hidden" : "allowed";
}
