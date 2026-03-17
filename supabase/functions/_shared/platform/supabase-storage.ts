/**
 * Supabase Storage Adapter
 *
 * Implements StoragePort by delegating to Supabase Storage.
 * Alternative implementations can wrap S3, GCS, R2, etc.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import type { StoragePort } from './types.ts';

export class SupabaseStorageAdapter implements StoragePort {
  constructor(private client: SupabaseClient) {}

  async upload(
    bucket: string,
    path: string,
    data: Uint8Array | Blob,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ error: string | null }> {
    const { error } = await this.client.storage.from(bucket).upload(path, data, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });
    return { error: error?.message ?? null };
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<{ signedUrl: string | null; error: string | null }> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn);
    return {
      signedUrl: data?.signedUrl ?? null,
      error: error?.message ?? null,
    };
  }

  async remove(bucket: string, paths: string[]): Promise<{ error: string | null }> {
    const { error } = await this.client.storage.from(bucket).remove(paths);
    return { error: error?.message ?? null };
  }
}
