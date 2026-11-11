/*
 * ──────────────────────────────────────────────────────────────────────────
 *  EXTENSION POINT: import a recipe from a link or a photo using an AI service
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Prepline is free to run, so this is NOT wired up. Text import
 *  (src/import/parseRecipe.ts) works today without any service.
 *
 *  To add link/photo import later:
 *   1. Implement `RecipeImporter` below in a new file, e.g. `claudeImporter.ts`.
 *      Send the page text (for links) or the image (for photos) to your AI
 *      provider and ask for JSON matching `ImportedRecipe`.
 *   2. Never put an API key in this app's code — it ships to every phone.
 *      Call the AI from a tiny server you control (a Cloudflare Worker on the
 *      free tier is enough) and keep the key there.
 *   3. Register it with `setRecipeImporter(...)` at startup. The Recipes
 *      screen's "From a link" / "From a photo" buttons enable themselves
 *      automatically when an importer is registered.
 *   4. Pass the result through `fromImported()` so ingredient lines are
 *      matched to the price table with the same parser used for text import.
 * ──────────────────────────────────────────────────────────────────────────
 */
import type { Ingredient } from '../types';
import { parseRecipeText, type ParsedRecipe } from './parseRecipe';

export interface ImportedRecipe {
  title: string;
  servings?: number;
  minutes?: number;
  ingredients: string[]; // one line each, e.g. "2 cups chickpeas"
  steps: string[];
}

export interface RecipeImporter {
  fromUrl?(url: string): Promise<ImportedRecipe>;
  fromImage?(image: Blob): Promise<ImportedRecipe>;
}

let importer: RecipeImporter | null = null;

export const setRecipeImporter = (i: RecipeImporter | null) => {
  importer = i;
};
export const getRecipeImporter = () => importer;

/** Turn an AI result into the same shape the text parser produces. */
export function fromImported(r: ImportedRecipe, ingredients: Ingredient[]): ParsedRecipe {
  const text = [r.title, r.servings ? `Serves ${r.servings}` : '', r.minutes ? `Time: ${r.minutes} minutes` : '', 'Ingredients', ...r.ingredients, 'Method', ...r.steps]
    .filter(Boolean)
    .join('\n');
  return parseRecipeText(text, ingredients);
}
