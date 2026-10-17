/** Only listing paths may be used as sign-in return destinations. */
export function listingReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/listings\/[a-zA-Z0-9-]+$/.test(value)
    ? value
    : undefined;
}

export function inventoryCountry(country: string): string {
  return country.trim();
}