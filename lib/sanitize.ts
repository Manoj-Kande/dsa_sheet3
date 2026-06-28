// Strips HTML tags and trims input to prevent XSS via stored content
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")   // strip HTML tags
    .replace(/[<>]/g, "")      // strip remaining angle brackets
    .trim();
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// Apply to all user-provided string fields before DB write
export function sanitizeSheetInput(data: {
  title?: string;
  description?: string;
  note?: string;
}) {
  return {
    title:       data.title       ? sanitizeText(data.title).slice(0, 100)       : undefined,
    description: data.description ? sanitizeText(data.description).slice(0, 500) : undefined,
    note:        data.note        ? sanitizeText(data.note).slice(0, 1000)        : undefined,
  };
}
