import { Suspense, lazy, useState } from "react"
import {
  ArrowLeft,
  Wallet,
  Clock,
  AlertTriangle,
  RefreshCw,
  Check,
  Bookmark,
  LayoutTemplate,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useTranslation } from "@/i18n"
import { QuestCreationProvider, useQuestCreation } from "./context"
import { StepIndicator } from "./types"
import { QUEST_TEMPLATES } from "./templates"
import { questDrafts } from "./drafts"

const Step1Form = lazy(() => import("./step1").then(m => ({ default: m.Step1Form })))
const Step2Form = lazy(() => import("./step2").then(m => ({ default: m.Step2Form })))
const Step3Review = lazy(() => import("./step3").then(m => ({ default: m.Step3Review })))

const StepFallback = () => (
  <div className="bg-muted border-border h-[400px] animate-pulse border shadow-md" />
)

interface CreateQuestProps {
  onBack: () => void
}

function CreateQuestContent({ onBack }: CreateQuestProps) {
  const { t } = useTranslation()
  const {
    currentStep,
    step1Data,
    step2Data,
    loadDraft,
    lastSaved,
    hasConflict,
    hasDraftToRestore,
    draftTimestamp,
    restoreDraft,
    dismissDraft,
  } = useQuestCreation()
  const [showLibrary, setShowLibrary] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const saveDraft = () => {
    const id = `${Date.now()}`
    questDrafts.save({ id, step1: step1Data, step2: step2Data, currentStep })
    setNotice(t("create.draftSaved"))
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-30" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground group mb-6 flex cursor-pointer items-center gap-2 text-sm font-bold transition-colors"
      >
        <div className="border-border bg-background neo-press hover:bg-accent flex h-7 w-7 items-center justify-center border shadow-sm transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        {t("create.backToDashboard")}
      </button>

      {/* Draft recovery banner */}
      {hasDraftToRestore && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <RefreshCw className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <span className="font-semibold">{t("create.draftFound")}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("create.draftPrompt", {
                    timestamp: draftTimestamp
                      ? draftTimestamp.toLocaleTimeString()
                      : t("create.draftFallbackTime"),
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={restoreDraft} className="h-7 px-2.5 text-xs">
                {t("create.restoreDraft")}
              </Button>
              <Button variant="ghost" size="sm" onClick={dismissDraft} className="h-7 px-2 text-xs">
                {t("create.discard")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict detection banner */}
      {hasConflict && (
        <div className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">{t("create.conflict")}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("create.conflictBody")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={restoreDraft}
              className="h-7 px-2.5 text-xs border-warning/40 text-foreground"
            >
              {t("create.syncLatest")}
            </Button>
          </div>
        </div>
      )}

      {/* Page heading with Auto-save indicator */}
      <div className="animate-fade-in-up relative mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold">{t("create.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("create.subtitle")}</p>
        </div>

        {/* Visual indicator showing last saved time */}
        <div
          data-testid="draft-status-indicator"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground font-mono"
        >
          {lastSaved ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span>{t("create.savedAt", { time: lastSaved.toLocaleTimeString() })}</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{t("create.autoSaveActive")}</span>
            </>
          )}
        </div>
      </div>

      <div className="relative mb-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowLibrary(value => !value)}>
          <LayoutTemplate className="h-4 w-4" /> {t("create.templates")}
        </Button>
        <Button variant="outline" size="sm" onClick={saveDraft}>
          <Bookmark className="h-4 w-4" /> {t("create.saveDraft")}
        </Button>
        {notice && <span className="text-muted-foreground self-center text-xs font-semibold">{notice}</span>}
      </div>

      {showLibrary && (
        <div className="border-border bg-background relative mb-6 border p-4 shadow-md">
          <button aria-label={t("create.closeLibrary")} onClick={() => setShowLibrary(false)} className="absolute right-3 top-3"><X className="h-4 w-4" /></button>
          <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">{t("create.startFromTemplate")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUEST_TEMPLATES.map(template => <button key={template.id} type="button" onClick={() => { loadDraft(template.step1, template.step2, 1); setShowLibrary(false); setNotice(t("create.templateLoaded", { name: template.name })) }} className="border-border hover:bg-secondary border p-3 text-left">
              <span className="block text-sm font-semibold">{template.name}</span><span className="text-muted-foreground text-xs">{template.description}</span>
            </button>)}
          </div>
          <p className="mb-2 mt-5 text-xs font-bold uppercase text-muted-foreground">{t("create.savedDrafts")}</p>
          {questDrafts.list().length ? <div className="space-y-2">{questDrafts.list().map(draft => <div key={draft.id} className="border-border flex items-center justify-between border p-2"><span className="text-sm font-semibold">{draft.step1.name || t("create.untitledQuest")}</span><div className="flex gap-2"><button className="text-xs font-bold underline" onClick={() => { loadDraft(draft.step1, draft.step2, draft.currentStep); setShowLibrary(false) }}>{t("create.open")}</button><button className="text-destructive text-xs font-bold underline" onClick={() => { questDrafts.remove(draft.id); setShowLibrary(false); setShowLibrary(true) }}>{t("common.delete")}</button></div></div>)}</div> : <p className="text-muted-foreground text-sm">{t("create.noSavedDrafts")}</p>}
        </div>
      )}

      {/* Step indicator */}
      <div className="animate-fade-in-up stagger-1 relative">
        <StepIndicator current={currentStep} />
      </div>

      {/* Step content */}
      <div className="animate-fade-in-up stagger-2 relative">
        <Suspense fallback={<StepFallback />}>
          {currentStep === 1 && <Step1Form />}
          {currentStep === 2 && <Step2Form />}
          {currentStep === 3 && <Step3Review onComplete={onBack} />}
        </Suspense>
      </div>
    </div>
  )
}

export function CreateQuest({ onBack }: CreateQuestProps) {
  const { t } = useTranslation()
  const { connected, connect, loading } = useWallet()

  if (!connected) {
    return (
      <div className="relative flex min-h-[calc(100vh-67px)] items-center justify-center overflow-hidden">
        <div className="bg-grid-dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-md px-4">
          <div className="bg-background border-border animate-scale-in overflow-hidden border shadow-xl">
            <div className="bg-accent border-border flex items-center justify-between border-b px-6 py-3">
              <span className="text-xs font-semibold tracking-wider uppercase">
                {t("dashboard.createQuest")}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="bg-destructive border-border h-2.5 w-2.5 border" />
                <span className="text-xs font-bold">{t("create.notConnected")}</span>
              </div>
            </div>
            <div className="p-8 text-center">
              <div className="bg-accent border-border mx-auto mb-5 flex h-16 w-16 items-center justify-center border shadow-md">
                <Wallet className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">{t("create.connectWallet")}</h2>
              <p className="text-muted-foreground mb-6 text-sm">{t("create.connectBody")}</p>
              <Button
                size="lg"
                onClick={() => void connect()}
                disabled={loading}
                className="shimmer-on-hover w-full"
              >
                <Wallet className="h-4 w-4" />
                {loading ? t("nav.connecting") : t("nav.connectWallet")}
              </Button>
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground mx-auto mt-4 flex cursor-pointer items-center gap-1 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                {t("create.backToDashboard")}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <QuestCreationProvider>
      <CreateQuestContent onBack={onBack} />
    </QuestCreationProvider>
  )
}
