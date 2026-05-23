import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileAvatarUploaderProps = {
  previewUrl?: string;
  initials: string;
  onChange: (file: File | null) => void;
};

export function ProfileAvatarUploader({
  previewUrl,
  initials,
  onChange,
}: ProfileAvatarUploaderProps) {
  return (
    <label className="group relative inline-flex cursor-pointer">
      <Avatar className="h-28 w-28 border-4 border-card shadow-xl">
        {previewUrl && <AvatarImage src={previewUrl} alt="Profile preview" />}
        <AvatarFallback className="bg-primary text-3xl font-semibold text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition group-hover:bg-accent">
        <Camera className="h-4 w-4" />
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}

