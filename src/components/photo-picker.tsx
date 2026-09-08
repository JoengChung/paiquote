import { Camera, Images } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: File[]) => void;
  className?: string;
  cameraClassName?: string;
  albumClassName?: string;
  cameraLabel?: string;
  albumLabel?: string;
};

export function PhotoPicker({
  onFiles,
  className,
  cameraClassName,
  albumClassName,
  cameraLabel = "拍照",
  albumLabel = "相册",
}: Props) {
  return (
    <div className={cn("flex gap-2", className)}>
      <label className={cameraClassName}>
        <Camera className="size-4" />
        {cameraLabel}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onFiles(files);
            e.target.value = "";
          }}
        />
      </label>
      <label className={albumClassName}>
        <Images className="size-4" />
        {albumLabel}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onFiles(files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
