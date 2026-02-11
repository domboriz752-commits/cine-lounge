import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { uploadFilm, uploadFilmFromUrl, enrichFilmWithAI } from "@/lib/api";
import { Upload as UploadIcon, Link, FileVideo, Loader2, CheckCircle, Sparkles, ArrowLeft, Magnet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type UploadMode = "file" | "url";
type UploadState = "idle" | "uploading" | "enriching" | "done";

const ACCEPTED_EXTENSIONS = ".mp4,.mkv,.avi,.webm,.mov,.flv,.wmv,.m4v,.ts,.ogv";

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>("file");
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [uploadedFilmId, setUploadedFilmId] = useState<string | null>(null);

  const isVideoFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    return file.type.startsWith("video/") || ["mkv", "avi", "webm", "mov", "flv", "wmv", "m4v", "ts", "ogv", "mp4"].includes(ext);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && isVideoFile(file)) {
      setSelectedFile(file);
    } else {
      toast.error("Please drop a video file (.mp4, .mkv, .avi, .webm, .mov, etc.)");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const canSubmit =
    state === "idle" &&
    ((mode === "file" && selectedFile) || (mode === "url" && url.trim()));

  const handleUpload = async () => {
    if (!canSubmit) return;
    setState("uploading");

    try {
      let filmId: string;

      if (mode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("video", selectedFile);
        const result = await uploadFilm(formData);
        filmId = result.film.id;
      } else {
        const result = await uploadFilmFromUrl({ url: url.trim() });
        filmId = result.film.id;
      }

      toast.success("Film uploaded! AI is now analyzing...");
      setUploadedFilmId(filmId);

      setState("enriching");
      try {
        await enrichFilmWithAI(filmId);
        toast.success("AI enrichment complete — title, genres, poster & more generated!");
      } catch (err) {
        console.error("AI enrichment failed:", err);
        toast.error("AI enrichment failed — you can retry later");
      }

      setState("done");
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Upload failed");
      setState("idle");
    }
  };

  const reset = () => {
    setState("idle");
    setSelectedFile(null);
    setUrl("");
    setUploadedFilmId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-16">
        <button
          onClick={() => navigate("/home")}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Upload Film</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Just upload the file — AI will automatically detect the title, genres, description, poster, and more.
        </p>

        {/* Mode tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setMode("file")}
            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition ${
              mode === "file"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileVideo size={16} /> Local File
          </button>
          <button
            onClick={() => setMode("url")}
            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition ${
              mode === "url"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link size={16} /> URL / Magnet
          </button>
        </div>

        <AnimatePresence mode="wait">
          {state === "done" ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 rounded-lg border border-border bg-secondary/50 p-12"
            >
              <CheckCircle size={48} className="text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Upload Complete!</h2>
              <p className="text-sm text-muted-foreground">AI has generated all metadata for your film.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/film/${uploadedFilmId}`)}
                  className="rounded bg-primary px-5 py-2 font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Watch Now
                </button>
                <button
                  onClick={reset}
                  className="rounded bg-secondary px-5 py-2 font-medium text-foreground transition hover:bg-accent"
                >
                  Upload Another
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {mode === "file" ? (
                <div
                  className={`mb-6 flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-12 transition ${
                    dragOver
                      ? "border-primary bg-primary/10"
                      : selectedFile
                      ? "border-primary/50 bg-secondary/50"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <UploadIcon size={32} className={selectedFile ? "text-primary" : "text-muted-foreground"} />
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB — ready to upload
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-medium text-foreground">Drop video file here</p>
                      <p className="text-xs text-muted-foreground">
                        MP4, MKV, AVI, WebM, MOV, FLV, WMV & more
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Video URL or Magnet Link</label>
                  <input
                    className="w-full rounded border border-border bg-secondary px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="https://example.com/movie.mp4 or magnet:?xt=..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Direct URLs and magnet links supported.
                  </p>
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={!canSubmit}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "uploading" && <Loader2 size={18} className="animate-spin" />}
                {state === "enriching" && <Sparkles size={18} className="animate-pulse" />}
                {state === "idle" && "Upload — AI handles the rest"}
                {state === "uploading" && "Uploading..."}
                {state === "enriching" && "AI is analyzing your film..."}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
