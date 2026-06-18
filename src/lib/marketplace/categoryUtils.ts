import { OZON_CATEGORIES, OzonCategory } from './ozonCategories';
import { SEMANTIC_GROUPS, SemanticGroup, getGroupBaseHashtags } from './semanticGroups';
import { rankHashtags } from './hashtagGenerator';
import { dedupHashtagsMorphological } from './stemmer';

/** Find category by its slug ID */
export function findCategoryById(id: string): OzonCategory | undefined {
  return OZON_CATEGORIES.find(c => c.id === id);
}

/** Find category by its Russian name (exact match) */
export function findCategoryByName(name: string): OzonCategory | undefined {
  return OZON_CATEGORIES.find(c => c.name === name);
}

/** Fuzzy search categories — matches against category name and product types */
export function searchCategories(query: string): OzonCategory[] {
  if (!query.trim()) return OZON_CATEGORIES;

  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);

  return OZON_CATEGORIES.filter(cat => {
    const nameLower = cat.name.toLowerCase();
    const typesLower = cat.productTypes.join(' ').toLowerCase();
    const combined = nameLower + ' ' + typesLower;

    // All words must match somewhere
    return words.every(word => combined.includes(word));
  });
}

/** Get categories in the same semantic group (adjacent categories) */
export function getAdjacentCategories(categoryId: string): OzonCategory[] {
  const cat = findCategoryById(categoryId);
  if (!cat) return [];

  return OZON_CATEGORIES.filter(c =>
    c.id !== categoryId && c.semanticGroup === cat.semanticGroup
  );
}

/** Get all base hashtags for a category's semantic group */
export function getCategoryGroupHashtags(categoryId: string): string[] {
  const cat = findCategoryById(categoryId);
  if (!cat) return [];
  return getGroupBaseHashtags(cat.semanticGroup);
}

/** Get the semantic group for a category */
export function getCategoryGroup(categoryId: string): SemanticGroup | undefined {
  const cat = findCategoryById(categoryId);
  if (!cat) return undefined;
  return SEMANTIC_GROUPS.find(g => g.id === cat.semanticGroup);
}

/** Get all semantic groups */
export function getAllSemanticGroups(): SemanticGroup[] {
  return SEMANTIC_GROUPS;
}

/** Get categories grouped by semantic group */
export function getCategoriesByGroup(): Record<string, OzonCategory[]> {
  const result: Record<string, OzonCategory[]> = {};
  for (const cat of OZON_CATEGORIES) {
    if (!result[cat.semanticGroup]) result[cat.semanticGroup] = [];
    result[cat.semanticGroup].push(cat);
  }
  return result;
}

/** Generate hashtags from a category + product type + custom keywords */
export function generateHashtagsFromCategory(
  categoryId: string,
  productType?: string,
  customKeywords: string[] = [],
  productName?: string
): string[] {
  const hashtags: string[] = [];
  const cat = findCategoryById(categoryId);
  if (!cat) return hashtags;

  // 1. Category name → hashtags
  const catWords = cat.name
    .replace(/[,.\-()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['для', 'или', 'при', 'над', 'под'].includes(w.toLowerCase()));

  catWords.forEach(word => {
    const tag = '#' + word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
    if (tag.length > 2 && tag.length <= 30 && !hashtags.includes(tag)) {
      hashtags.push(tag);
    }
  });

  // 2. Product type → hashtags
  if (productType) {
    const typeWords = productType
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['для', 'или', 'при', 'над', 'под', 'и'].includes(w.toLowerCase()));

    typeWords.forEach(word => {
      const tag = '#' + word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      if (tag.length > 2 && tag.length <= 30 && !hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    });

    // The product type itself as a hashtag
    const typeTag = '#' + productType.toLowerCase().replace(/\s+/g, '').replace(/[^a-zа-яё0-9#]/gi, '');
    if (typeTag.length > 2 && typeTag.length <= 30 && !hashtags.includes(typeTag)) {
      hashtags.push(typeTag);
    }
  }

  // 3. Semantic group base hashtags
  const groupHashtags = getGroupBaseHashtags(cat.semanticGroup);
  groupHashtags.forEach(tag => {
    const formatted = tag.startsWith('#') ? tag : '#' + tag;
    if (!hashtags.includes(formatted)) {
      hashtags.push(formatted);
    }
  });

  // 4. Product name → extract meaningful words
  if (productName) {
    const nameWords = productName
      .replace(/[,.\-()!?"'/\\]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !isForbiddenWord(w));

    nameWords.slice(0, 5).forEach(word => {
      const tag = '#' + word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      if (tag.length > 2 && tag.length <= 30 && !hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    });
  }

  // 5. Custom keywords → hashtags
  customKeywords.forEach(keyword => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    // If it starts with #, treat as a ready hashtag
    if (trimmed.startsWith('#')) {
      if (trimmed.length <= 30 && !hashtags.includes(trimmed)) {
        hashtags.push(trimmed);
      }
    } else {
      // Split multi-word keywords into individual tags AND a combined tag
      const words = trimmed.split(/\s+/).filter(Boolean);

      // Combined tag from all words
      const combined = '#' + trimmed.toLowerCase().replace(/\s+/g, '').replace(/[^a-zа-яё0-9]/gi, '');
      if (combined.length > 2 && combined.length <= 30 && !hashtags.includes(combined)) {
        hashtags.push(combined);
      }

      // Individual word tags
      words.forEach(word => {
        if (word.length > 2) {
          const tag = '#' + word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
          if (tag.length > 2 && tag.length <= 30 && !hashtags.includes(tag)) {
            hashtags.push(tag);
          }
        }
      });
    }
  });

  // 6. Add adjacent category hashtags (top 3 from adjacent categories)
  const adjacentCats = getAdjacentCategories(categoryId);
  const adjHashtags: string[] = [];
  adjacentCats.slice(0, 3).forEach(adjCat => {
    const adjWords = adjCat.name
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    adjWords.slice(0, 2).forEach(word => {
      const tag = '#' + word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      if (tag.length > 2 && tag.length <= 30 && !hashtags.includes(tag) && !adjHashtags.includes(tag)) {
        adjHashtags.push(tag);
      }
    });
  });
  hashtags.push(...adjHashtags.slice(0, 6));

  // 7. Universal marketplace fallback hashtags — ensure a healthy minimum
  //     even for short category names. Russian-first, non-promotional.
  const UNIVERSAL_FALLBACK = [
    '#выбор', '#топ', '#качество', '#новинка', '#популярное',
    '#оригинал', '#хит', '#мастхэв', '#практичность', '#длядома',
    '#подарок', '#идея', '#находка', '#стиль', '#дизайн',
    '#комфорт', '#радость', '#тренд', '#лучшее', '#рекомендация',
  ];
  for (const tag of UNIVERSAL_FALLBACK) {
    if (hashtags.length >= 30) break;
    if (!hashtags.includes(tag)) {
      hashtags.push(tag);
    }
  }

  // Validate length + format first
  const valid = hashtags
    .filter(tag => tag.length > 2 && tag.length <= 30)
    .filter(tag => /^#[a-zа-яё0-9]+$/i.test(tag));

  // Morphological dedup (#плед / #пледы → keep first), then rank russian-first, cap 30
  const deduped = dedupHashtagsMorphological(valid);
  return rankHashtags(deduped).slice(0, 30);
}

/**
 * Generate hashtags by merging multiple categories.
 * The primary category is generated in full (including product name extraction
 * and custom keywords), while secondary categories contribute their category-name
 * tags and semantic-group base hashtags only (no product-name extraction — that
 * would be misleading for products from a different category).
 *
 * Use case: a seller with mixed products (e.g. «Пледы» + «Постельное белье»)
 * wants hashtags from both categories to appear for each product.
 *
 * @param primaryCategoryId  The main category (full generation)
 * @param secondaryCategoryIds  Additional categories (name + group hashtags only)
 * @param productType  Product type within the primary category
 * @param customKeywords  Free-form keywords
 * @param productName  Product name (only used for primary category)
 */
export function generateHashtagsFromMultipleCategories(
  primaryCategoryId: string,
  secondaryCategoryIds: string[],
  productType?: string,
  customKeywords: string[] = [],
  productName?: string
): string[] {
  // Primary category: full generation
  const primaryTags = generateHashtagsFromCategory(
    primaryCategoryId,
    productType,
    customKeywords,
    productName
  );

  if (secondaryCategoryIds.length === 0) {
    return primaryTags;
  }

  // Secondary categories: only name + group base hashtags (no product name, no custom keywords)
  const secondaryTags: string[] = [];
  for (const secId of secondaryCategoryIds) {
    if (secId === primaryCategoryId) continue; // skip duplicates of primary
    const secCat = findCategoryById(secId);
    if (!secCat) continue;

    // Category name → hashtags
    const catWords = secCat.name
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['для', 'или', 'при', 'над', 'под'].includes(w.toLowerCase()));
    catWords.forEach(word => {
      const tag = '#' + word.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      if (tag.length > 2 && tag.length <= 30 && !secondaryTags.includes(tag)) {
        secondaryTags.push(tag);
      }
    });

    // Semantic group base hashtags
    const groupHashtags = getGroupBaseHashtags(secCat.semanticGroup);
    groupHashtags.forEach(tag => {
      const formatted = tag.startsWith('#') ? tag : '#' + tag;
      if (!secondaryTags.includes(formatted)) {
        secondaryTags.push(formatted);
      }
    });
  }

  // Merge: primary first, then secondary (deduplicated, ranked, capped)
  const merged = dedupHashtagsMorphological([...primaryTags, ...secondaryTags]);
  return rankHashtags(merged).slice(0, 30);
}

/** Forbidden words that shouldn't become hashtags */
const FORBIDDEN_WORDS = new Set([
  'для', 'или', 'при', 'над', 'под', 'без', 'про', 'через', 'между',
  'перед', 'после', 'около', 'возле', 'рядом', 'вокруг', 'среди',
  'кроме', 'вместо', 'вдоль', 'мимо', 'от', 'до', 'из', 'за', 'на',
  'по', 'с', 'у', 'к', 'в', 'о', 'об', 'со', 'ко', 'во', 'не',
  'нет', 'да', 'же', 'ли', 'бы', 'уж', 'вот', 'это', 'то', 'то',
  'все', 'всё', 'ещё', 'уже', 'еще', 'тоже', 'также', 'причем',
  'size', 'sizes', 'размер', 'размеры', 'xl', 'xxl', 'xxxl',
  'шт', 'упак', 'набор', 'комплект'
]);

function isForbiddenWord(word: string): boolean {
  return FORBIDDEN_WORDS.has(word.toLowerCase());
}

/** Russian transliteration for slug generation */
export function toSlug(text: string): string {
  const map: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
    'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };

  let slug = text.toLowerCase();
  for (const [ru, en] of Object.entries(map)) {
    slug = slug.replaceAll(ru, en);
  }
  slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug;
}
