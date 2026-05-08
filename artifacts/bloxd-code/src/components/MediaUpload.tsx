import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Cloud, Link, Upload, Trash2 } from "lucide-react";

interface MediaItem {
  name: string;
  url: string;
  updated_at: string;
}

interface MediaUploadProps {
  userId: string;
  title?: string;
  description?: string;
  uploadFolder?: string;
}

const MEDIA_STORAGE_KEY = 'bloxd_demo_media';

const MediaUpload = ({
  userId,
  title = "Media Upload",
  description,
}: MediaUploadProps) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const storageKey = `${MEDIA_STORAGE_KEY}_${userId}`;

  const fetchItems = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      setItems([]);
    }
  };

  const saveItems = (newItems: MediaItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(newItems));
    setItems(newItems);
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
    
    // Create a local URL for the file (demo mode)
    const url = URL.createObjectURL(file);
    
    const newItem: MediaItem = {
      name: file.name,
      url,
      updated_at: new Date().toISOString(),
    };
    
    const newItems = [...items, newItem];
    saveItems(newItems);
    
    toast({ title: "Uploaded", description: `${file.name} is now available. (Demo mode - stored locally)` });
    setUploading(false);
  };

  const deleteItem = (name: string) => {
    const newItems = items.filter(item => item.name !== name);
    saveItems(newItems);
    toast({ title: "Deleted", description: "File removed from your media library." });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            {description || "Upload images, videos, or documents to your profile media library."}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">Demo mode: Files stored locally in browser</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload file"}
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
            <div
              key={item.name}
              className="group rounded-lg border border-border p-3 transition hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 space-y-1"
                >
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.updated_at).toLocaleString()}
                  </p>
                </a>
                <div className="flex items-center gap-2">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <Link className="h-4 w-4 text-primary hover:text-primary/80" />
                  </a>
                  <button onClick={() => deleteItem(item.name)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
