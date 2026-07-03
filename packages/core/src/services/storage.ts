/**
 * Upload de imagens do catálogo para o Supabase Storage (bucket público
 * `catalog-images`). Platform-agnostic: recebe um Blob (File no browser,
 * Blob/File no RN) e devolve a URL pública. Escrita EXIGE Supabase configurado
 * — sem client, lança (como as demais escritas do catálogo).
 *
 * A URL pública devolvida é gravada nos campos *_url dos schemas (que exigem
 * .url()), então nada muda na camada de dados: só a forma de obter a URL.
 */
import { getConfiguredSupabase } from '../supabase/client';

export const CATALOG_IMAGES_BUCKET = 'catalog-images';

/** 8MB — limite de sanidade no cliente; o bucket aceita até 50MiB. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// mime → extensão. Fallback 'bin' se o tipo for desconhecido (não deveria
// acontecer: o input restringe a image/*).
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
};

function extFor(contentType: string): string {
  return EXT_BY_MIME[contentType.toLowerCase()] ?? 'bin';
}

// Id único sem depender de import de node. crypto.randomUUID existe em browser
// e RN modernos; o fallback cobre ambientes sem ele.
function uniqueId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // ponytail: fallback improvável (crypto.randomUUID é universal hoje);
  // colisão é irrelevante para nomes de arquivo de um admin.
  return `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;
}

function requireStorage() {
  const client = getConfiguredSupabase();
  if (client === null) {
    throw new Error('Supabase não configurado: upload indisponível');
  }
  return client.storage.from(CATALOG_IMAGES_BUCKET);
}

export interface UploadImageOptions {
  /** Pasta lógica dentro do bucket, ex.: 'establishments' | 'events'. */
  pathPrefix: string;
}

/**
 * Sobe uma imagem e devolve sua URL pública. O nome é gerado (uuid + ext do
 * mime), então uploads nunca colidem nem sobrescrevem.
 */
export async function uploadImage(
  file: Blob,
  { pathPrefix }: UploadImageOptions,
): Promise<string> {
  const bucket = requireStorage();
  const contentType = file.type || 'application/octet-stream';
  const path = `${pathPrefix}/${uniqueId()}.${extFor(contentType)}`;

  const { error } = await bucket.upload(path, file, { contentType, upsert: false });
  if (error) {
    throw error;
  }

  return bucket.getPublicUrl(path).data.publicUrl;
}

/**
 * Deriva o path interno do bucket a partir de uma URL pública dele. Retorna
 * null se a URL não pertencer a este bucket (ex.: URL externa colada à mão).
 */
export function pathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/${CATALOG_IMAGES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length);
  return path.length > 0 ? path : null;
}

/**
 * Remove uma imagem do bucket a partir da URL pública. No-op para URLs que não
 * são deste bucket (URLs externas coladas à mão não devem ser tocadas).
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const path = pathFromPublicUrl(publicUrl);
  if (path === null) return;
  const bucket = requireStorage();
  const { error } = await bucket.remove([path]);
  if (error) {
    throw error;
  }
}
