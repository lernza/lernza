import { useState } from "react"
import {
  User,
  MapPin,
  Link2,
  Tag,
  FileText,
  Edit3,
  Save,
  X,
  Eye,
  Users,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  type ProfileMetadata,
  type ProfileFieldPrivacy,
  type ProfileSocialLink,
  type PrivacyLevel,
  PROFILE_FIELD_LIMITS,
  PrivacyLevel as PL,
} from "@/lib/profile-types"
import { cn } from "@/lib/utils"

interface PrivacySelectorProps {
  value: PrivacyLevel
  onChange: (value: PrivacyLevel) => void
  size?: "sm" | "md"
}

function PrivacySelector({ value, onChange, size = "sm" }: PrivacySelectorProps) {
  const options: { value: PrivacyLevel; label: string; icon: typeof Eye }[] = [
    { value: PL.Public, label: "Public", icon: Eye },
    { value: PL.Connections, label: "Connections", icon: Users },
    { value: PL.Private, label: "Private", icon: Lock },
  ]

  return (
    <div className={`flex gap-1 ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {options.map(opt => {
        const Icon = opt.icon
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "border-border flex items-center gap-1 border px-2 py-1 transition-colors",
              isActive
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background hover:bg-secondary text-muted-foreground"
            )}
            title={`${opt.label} visibility`}
          >
            <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
            <span className="hidden font-semibold sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

interface FieldWithPrivacyProps {
  label: string
  icon: typeof User
  privacyValue: PrivacyLevel
  onPrivacyChange: (v: PrivacyLevel) => void
  children: React.ReactNode
  description?: string
}

function FieldWithPrivacy({
  label,
  icon: Icon,
  privacyValue,
  onPrivacyChange,
  children,
  description,
}: FieldWithPrivacyProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4" />
          <label className="text-sm font-semibold">{label}</label>
        </div>
        <PrivacySelector value={privacyValue} onChange={onPrivacyChange} />
      </div>
      {children}
      {description && <p className="text-muted-foreground text-xs font-bold">{description}</p>}
    </div>
  )
}

interface ProfileEditorProps {
  metadata: ProfileMetadata
  fieldPrivacy: ProfileFieldPrivacy
  onSave: (metadata: ProfileMetadata, privacy: ProfileFieldPrivacy) => void
  onCancel?: () => void
}

export function ProfileEditor({ metadata, fieldPrivacy, onSave, onCancel }: ProfileEditorProps) {
  const [localMeta, setLocalMeta] = useState<ProfileMetadata>({ ...metadata })
  const [localPrivacy, setLocalPrivacy] = useState<ProfileFieldPrivacy>({ ...fieldPrivacy })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addLink = () => {
    const newLink: ProfileSocialLink = {
      id: `link-${Date.now()}`,
      label: "",
      url: "",
      privacy: PL.Connections,
    }
    setLocalMeta(prev => ({ ...prev, links: [...prev.links, newLink] }))
  }

  const updateLink = (id: string, updates: Partial<ProfileSocialLink>) => {
    setLocalMeta(prev => ({
      ...prev,
      links: prev.links.map(l => (l.id === id ? { ...l, ...updates } : l)),
    }))
  }

  const removeLink = (id: string) => {
    setLocalMeta(prev => ({
      ...prev,
      links: prev.links.filter(l => l.id !== id),
    }))
  }

  const addTag = () => {
    const input = document.getElementById("new-tag-input") as HTMLInputElement | null
    if (!input) return
    const val = input.value.trim().toLowerCase()
    if (!val) return
    if (localMeta.tags.includes(val)) {
      input.value = ""
      return
    }
    if (localMeta.tags.length >= PROFILE_FIELD_LIMITS.MAX_TAGS) {
      setErrors(prev => ({ ...prev, tags: `Max ${PROFILE_FIELD_LIMITS.MAX_TAGS} tags allowed` }))
      return
    }
    setLocalMeta(prev => ({ ...prev, tags: [...prev.tags, val] }))
    input.value = ""
    setErrors(prev => {
      const next = { ...prev }
      delete next.tags
      return next
    })
  }

  const removeTag = (tag: string) => {
    setLocalMeta(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}

    if (localMeta.displayName.trim().length > 0) {
      if (localMeta.displayName.trim().length < PROFILE_FIELD_LIMITS.DISPLAY_NAME_MIN) {
        newErrors.displayName = `Must be at least ${PROFILE_FIELD_LIMITS.DISPLAY_NAME_MIN} characters`
      }
      if (localMeta.displayName.length > PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX) {
        newErrors.displayName = `Max ${PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX} characters`
      }
    }

    if (localMeta.bio.length > PROFILE_FIELD_LIMITS.BIO_MAX) {
      newErrors.bio = `Max ${PROFILE_FIELD_LIMITS.BIO_MAX} characters`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(localMeta, localPrivacy)
  }

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="bg-accent/10 border-border flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent border-border flex h-9 w-9 items-center justify-center border shadow-sm">
            <Edit3 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Edit Profile</CardTitle>
            <p className="text-muted-foreground text-xs font-bold">
              Customize your public profile and control visibility
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <FieldWithPrivacy
          label="Display Name"
          icon={User}
          privacyValue={localPrivacy.displayName}
          onPrivacyChange={v => setLocalPrivacy(prev => ({ ...prev, displayName: v }))}
          description="The name shown on your profile card and leaderboards"
        >
          <input
            type="text"
            value={localMeta.displayName}
            onChange={e => setLocalMeta(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="e.g., Alex Carter"
            maxLength={PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX}
            className={cn(
              "border-border bg-background focus:ring-accent/50 w-full border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none",
              errors.displayName && "border-destructive"
            )}
          />
          <div className="flex items-center justify-between">
            <div>
              {errors.displayName && (
                <p className="text-destructive mt-1 flex items-center gap-1 text-xs font-bold">
                  <AlertTriangle className="h-3 w-3" /> {errors.displayName}
                </p>
              )}
            </div>
            <span className="text-muted-foreground text-[10px] font-bold tabular-nums">
              {localMeta.displayName.length}/{PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX}
            </span>
          </div>
        </FieldWithPrivacy>

        <FieldWithPrivacy
          label="Bio"
          icon={FileText}
          privacyValue={localPrivacy.bio}
          onPrivacyChange={v => setLocalPrivacy(prev => ({ ...prev, bio: v }))}
          description="A short summary about you, your learning goals, or expertise"
        >
          <textarea
            value={localMeta.bio}
            onChange={e => setLocalMeta(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Passionate about learning Rust and DeFi. Currently exploring smart contract development..."
            maxLength={PROFILE_FIELD_LIMITS.BIO_MAX}
            rows={4}
            className={cn(
              "border-border bg-background focus:ring-accent/50 w-full resize-none border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none",
              errors.bio && "border-destructive"
            )}
          />
          <div className="flex items-center justify-between">
            <div>
              {errors.bio && (
                <p className="text-destructive mt-1 flex items-center gap-1 text-xs font-bold">
                  <AlertTriangle className="h-3 w-3" /> {errors.bio}
                </p>
              )}
            </div>
            <span className="text-muted-foreground text-[10px] font-bold tabular-nums">
              {localMeta.bio.length}/{PROFILE_FIELD_LIMITS.BIO_MAX}
            </span>
          </div>
        </FieldWithPrivacy>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FieldWithPrivacy
            label="Location"
            icon={MapPin}
            privacyValue={localPrivacy.location}
            onPrivacyChange={v => setLocalPrivacy(prev => ({ ...prev, location: v }))}
            description="Timezone or region for collaboration"
          >
            <input
              type="text"
              value={localMeta.location}
              onChange={e => setLocalMeta(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Berlin, Germany"
              maxLength={PROFILE_FIELD_LIMITS.LOCATION_MAX}
              className="border-border bg-background focus:ring-accent/50 w-full border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none"
            />
          </FieldWithPrivacy>

          <FieldWithPrivacy
            label="Avatar URL"
            icon={User}
            privacyValue={localPrivacy.avatarUrl}
            onPrivacyChange={v => setLocalPrivacy(prev => ({ ...prev, avatarUrl: v }))}
            description="https:// or ipfs:// URL for custom avatar"
          >
            <input
              type="url"
              value={localMeta.avatarUrl}
              onChange={e => setLocalMeta(prev => ({ ...prev, avatarUrl: e.target.value }))}
              placeholder="https://example.com/avatar.png"
              maxLength={PROFILE_FIELD_LIMITS.WEBSITE_URL_MAX}
              className="border-border bg-background focus:ring-accent/50 w-full border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none"
            />
          </FieldWithPrivacy>
        </div>

        <FieldWithPrivacy
          label="Skills & Interests"
          icon={Tag}
          privacyValue={localPrivacy.tags}
          onPrivacyChange={v => setLocalPrivacy(prev => ({ ...prev, tags: v }))}
          description="Tags help others discover your expertise"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {localMeta.tags.length === 0 ? (
                <span className="text-muted-foreground text-xs font-bold">No tags yet</span>
              ) : (
                localMeta.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="group flex items-center gap-1 border font-bold shadow-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="new-tag-input"
                type="text"
                placeholder="Add a tag (e.g., rust, defi, smart-contracts)"
                className="border-border bg-background focus:ring-accent/50 flex-1 border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button variant="outline" type="button" onClick={addTag}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {errors.tags && (
              <p className="text-destructive flex items-center gap-1 text-xs font-bold">
                <AlertTriangle className="h-3 w-3" /> {errors.tags}
              </p>
            )}
          </div>
        </FieldWithPrivacy>

        <FieldWithPrivacy
          label="Social Links"
          icon={Link2}
          privacyValue={localPrivacy.links}
          onPrivacyChange={v => setLocalPrivacy(prev => ({ ...prev, links: v }))}
          description={`Add up to ${PROFILE_FIELD_LIMITS.MAX_LINKS} links to your social profiles or portfolio`}
        >
          <div className="space-y-3">
            {localMeta.links.map((link, idx) => (
              <div
                key={link.id}
                className="border-border bg-accent/5 space-y-2 border p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Link {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <PrivacySelector
                      value={link.privacy}
                      onChange={p => updateLink(link.id, { privacy: p })}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      className="text-destructive border-border hover:bg-destructive/10 border p-1.5 transition-colors"
                      aria-label="Remove link"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr]">
                  <input
                    type="text"
                    value={link.label}
                    onChange={e => updateLink(link.id, { label: e.target.value })}
                    placeholder="Label (e.g., GitHub)"
                    maxLength={PROFILE_FIELD_LIMITS.LINK_LABEL_MAX}
                    className="border-border bg-background focus:ring-accent/50 border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={e => updateLink(link.id, { url: e.target.value })}
                    placeholder="https://github.com/yourhandle"
                    maxLength={PROFILE_FIELD_LIMITS.WEBSITE_URL_MAX}
                    className="border-border bg-background focus:ring-accent/50 border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
            ))}
            {localMeta.links.length < PROFILE_FIELD_LIMITS.MAX_LINKS && (
              <Button variant="outline" type="button" onClick={addLink} className="w-full">
                <Plus className="h-4 w-4" />
                Add Link
              </Button>
            )}
          </div>
        </FieldWithPrivacy>

        <div className="border-border flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button variant="outline" type="button" onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button type="button" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
