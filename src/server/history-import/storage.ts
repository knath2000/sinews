import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Readable } from "node:stream";

const STORAGE_BUCKET = "history-imports-temp";

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  cachedAdminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  return cachedAdminClient;
}

export async function ensureBucketExists(): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: 52_428_800, // 50MB (covers 25MB ZIP)
    });
    if (error) {
      // If it's a "bucket already exists" race condition, ignore
      if (!error.message.includes("already")) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
    }
  }
}

function storagePath(userId: string, importId: string): string {
  return `${userId}/${importId}.zip`;
}

export async function getSignedUploadUrl(userId: string, importId: string): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdminClient();
  const path = storagePath(userId, importId);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path, {
    upsert: true,
  });
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

export async function streamDownload(userId: string, importId: string): Promise<Readable> {
  const supabase = getSupabaseAdminClient();
  const path = storagePath(userId, importId);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path).asStream();
  if (error || !data) {
    throw new Error(`Failed to stream download ZIP: ${error?.message ?? "unknown error"}`);
  }
  // Supabase asStream returns a web ReadableStream; convert to Node Readable
  const webStream = data as ReadableStream<Uint8Array>;
  return new Readable({
    async read() {
      const reader = webStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
            return;
          }
          this.push(value);
        }
      } catch (err) {
        this.destroy(err as Error);
      }
    },
  });
}

export async function deleteZip(userId: string, importId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const path = storagePath(userId, importId);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Failed to delete ZIP: ${error.message}`);
  }
}
