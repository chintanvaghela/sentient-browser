import { SemanticRole } from './types.js';

export interface StableIdInput {
  role: SemanticRole;
  text?: string;
  tag?: string;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
  testId?: string;
  parentSlug?: string;
  disambiguationIndex?: number;
}

/**
 * Slugifies text into a clean snake_case string.
 * Strips special characters, trims whitespace, and limits length.
 */
export function slugify(text: string, maxLength: number = 32): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove special characters
    .trim()
    .replace(/[\s_-]+/g, '_') // replace spaces and hyphens with single underscore
    .slice(0, maxLength)
    .replace(/^_+|_+$/g, ''); // strip leading/trailing underscores
}

/**
 * Generates a deterministic, human-readable stable identifier for a semantic node.
 * Stays stable across dynamic re-renders, hydration, and framework re-mounts.
 */
export function generateStableId(input: StableIdInput): string {
  // 1. If explicit test ID or QA attribute exists, prioritize it
  if (input.testId) {
    return slugify(input.testId, 48);
  }

  // 2. Identify the most meaningful label (aria-label > text > placeholder > name)
  const candidateText =
    input.ariaLabel ||
    input.text ||
    input.placeholder ||
    input.name ||
    '';

  const textSlug = slugify(candidateText, 28);

  // 3. Formulate the base identifier
  let baseId = '';
  if (textSlug) {
    // If text already ends or starts with role, avoid duplication (e.g. "submit_button_button")
    if (textSlug.endsWith(`_${input.role}`) || textSlug === input.role) {
      baseId = textSlug;
    } else {
      baseId = `${textSlug}_${input.role}`;
    }
  } else {
    // If no meaningful text, fallback to tag + role
    baseId = `${input.role}`;
  }

  // 4. If parent context slug is provided and adds distinction, prefix or scope it
  let scopedId = baseId;
  if (input.parentSlug && !baseId.startsWith(input.parentSlug)) {
    // e.g. login_form__submit_button
    scopedId = `${input.parentSlug}__${baseId}`;
  }

  // 5. If multiple identical items exist in the same scope, append index
  if (input.disambiguationIndex !== undefined && input.disambiguationIndex > 1) {
    scopedId = `${scopedId}_${input.disambiguationIndex}`;
  }

  return scopedId;
}
