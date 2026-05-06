import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Cloud, Link, Upload } from "lucide-react";

interface MediaItem {
  name: string;
  url: string;
  updated_at?: string;
}

interface MediaUploadProps {
  userId: string;
  title?: string;
  description?: string;
  uploadFolder?: string;
}

const MediaUpload = ({
  userId,
  title = "Media Upload",
  description,
  uploadFolder = "media",
}: MediaUploadProps) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const storageFolder = `${uploadFolder}/${userId}`;

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("attachments")
        .list(storageFolder, { limit: 100, offset: 0 });

      if (error) {
        if (error.status !== 404) {
          throw error;
        }
        setItems([]);
        return;
      }

      if (!data) {
        setItems([]);
        return;
      }

      const loaded = await Promise.all(
        data.map(async (item) => {
          const { data: urlData } = supabase.storage
            .from("attachments")
            .getPublicUrl(`${storageFolder}/${item.name}`);
          return {
            name: item.name,
            url: urlData.publicUrl,
            updated_at: item.updated_at,
          };
        })
      );

      setItems(loaded);
    } catch (error) {
      toast({ title: "Media load failed", description: "Could not load uploaded files.", variant: "destructive" });
      setItems([]);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchItems();
  }, [userId]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    event.target.value = "";
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const filePath = `${storageFolder}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(filePath, file, {
      upsert: false,
    });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    await fetchItems();
    toast({ title: "Uploaded", description: `${file.name} is now available.` });
    setUploading(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            {description || "Upload images, videos, or documents to your profile media library."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading…" : "Upload file"}
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchItems}>
            <Cloud className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,application/pdf,application/zip"
        onChange={handleFileChange}
      />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          <Cloud className="mx-auto h-8 w-8 mb-3" />
          No media uploaded yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-border p-3 transition hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.updated_at ? new Date(item.updated_at).toLocaleString() : "Uploaded media"}
                  </p>
                </div>
                <Link className="h-4 w-4 text-primary group-hover:text-primary/80" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
