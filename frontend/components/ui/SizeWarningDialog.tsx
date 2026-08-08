"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

// Rough proxy: most text-based PDFs run ~50-100KB/page. 3MB caps you around
// 20-30 pages of normal text, which keeps chunk count under Gemini's free-tier
// rate limit for a single processing run.
export const SAFE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
export const HARD_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB — block entirely past this

interface SizeWarningDialogProps {
  open: boolean;
  fileSizeBytes: number;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SizeWarningDialog({
  open,
  fileSizeBytes,
  fileName,
  onConfirm,
  onCancel,
}: SizeWarningDialogProps) {
  const sizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  const isHardBlocked = fileSizeBytes > HARD_LIMIT_BYTES;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <DialogTitle>
              {isHardBlocked ? "File too large" : "Large PDF detected"}
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            <strong>{fileName}</strong> is {sizeMB} MB.
            {isHardBlocked ? (
              <>
                {" "}Files over 10 MB aren't supported — large PDFs generate too many
                chunks and reliably fail to embed due to API rate limits. Please
                split the document or upload a smaller section.
              </>
            ) : (
              <>
                {" "}Large PDFs can generate many chunks, and some may fail to embed
                due to API rate limits during processing. For best results, we
                recommend PDFs under 20-30 pages (roughly 3 MB). You can still
                proceed, but some content might not be fully searchable.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {!isHardBlocked && (
            <Button onClick={onConfirm}>Upload anyway</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}