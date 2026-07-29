import { useState, type ChangeEvent, type DragEvent } from "react"
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatTokens, cn } from "@/lib/utils"
import { parseCsvMilestones, generateCsvTemplate, type CsvParseResult, type ParsedMilestone } from "./csv-parser"

interface CsvImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (milestones: ParsedMilestone[], mode: "append" | "replace") => void
}

export function CsvImportDialog({ isOpen, onClose, onImport }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [importMode, setImportMode] = useState<"append" | "replace">("append")
  const [isDragging, setIsDragging] = useState(false)

  if (!isOpen) return null

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setParseResult({
        milestones: [],
        errors: [{ row: 0, field: "file", message: "Only .csv files are supported" }],
      })
      return
    }

    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsvMilestones(text || "")
      setParseResult(result)
    }
    reader.readAsText(selectedFile)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleDownloadTemplate = () => {
    const templateText = generateCsvTemplate()
    const blob = new Blob([templateText], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "milestones_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleConfirm = () => {
    if (parseResult && parseResult.milestones.length > 0) {
      onImport(parseResult.milestones, importMode)
      onClose()
    }
  }

  const totalReward =
    parseResult?.milestones.reduce((sum, m) => sum + m.rewardAmount, 0) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="border-border bg-background w-full max-w-xl border shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Import Milestones from CSV
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-destructive cursor-pointer transition-colors"
            aria-label="Close CSV import dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-border bg-muted/40 border-2 border-dashed p-6 text-center transition-colors",
              isDragging && "border-accent bg-accent/20"
            )}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold mb-1">
              Drag and drop your milestone CSV file here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Columns required: <code>title</code>, <code>description</code>, <code>rewardAmount</code>
            </p>
            <div className="flex items-center justify-center gap-3">
              <label className="border-border bg-background hover:bg-secondary cursor-pointer border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm">
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                View Template
              </button>
            </div>
          </div>

          {/* Selected File & Parse Summary */}
          {file && (
            <div className="flex items-center justify-between border border-border p-3 bg-secondary">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold truncate max-w-[240px]">{file.name}</span>
              </div>
              {parseResult && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{parseResult.milestones.length} Valid</Badge>
                  {parseResult.errors.length > 0 && (
                    <Badge variant="destructive">{parseResult.errors.length} Errors</Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Errors List */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="border border-destructive/40 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                CSV Parsing Errors ({parseResult.errors.length}):
              </div>
              <ul className="text-xs space-y-1 list-disc list-inside text-destructive font-medium max-h-32 overflow-y-auto">
                {parseResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: Field <code>{err.field}</code> — {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Valid Milestones Preview Table */}
          {parseResult && parseResult.milestones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Valid Milestones Preview ({parseResult.milestones.length})
                </span>
                <span className="text-xs font-semibold">
                  Total Reward: {formatTokens(totalReward)} USDC
                </span>
              </div>

              <div className="border border-border divide-y divide-border max-h-48 overflow-y-auto bg-background">
                {parseResult.milestones.map((m, idx) => (
                  <div key={idx} className="p-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold">{m.title}</p>
                      <p className="text-muted-foreground truncate max-w-sm">{m.description}</p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums flex-shrink-0">
                      {m.rewardAmount} USDC
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Import Mode Radio Options */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="accent-foreground"
                  />
                  Append to existing milestones
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-foreground"
                  />
                  Replace current milestones
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-secondary border-border flex items-center justify-end gap-3 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!parseResult || parseResult.milestones.length === 0}
            className="shimmer-on-hover"
          >
            <CheckCircle2 className="h-4 w-4" />
            Import {parseResult?.milestones.length || 0} Milestones
          </Button>
        </div>
      </div>
    </div>
  )
}
