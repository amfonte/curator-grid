import { useCallback, useEffect, useState } from "react"
import { CtaTextButton } from "../components/CtaTextButton"
import { fetchUrlMetadata } from "../lib/api"
import {
  bootstrapSkeletonFromBoards,
  type BootstrapHint,
} from "../lib/bootstrap-hint"
import { isAuthFailureMessage } from "../lib/auth-errors"
import { hasSelectableCollections, setCachedBoards, clearCachedBoards } from "../lib/boards-cache"
import {
  clearImageSelection,
  removeImageFromSelection,
  startPickMode,
  stopPickMode,
  subscribeToImageSelection,
  type SelectedImage,
} from "../lib/pick-mode"
import { isSaveableTabUrl, normalizeUrl } from "../lib/url"
import { sendBackgroundMessage, type AuthState, type ExtensionBoard, type PanelTab } from "../lib/messaging"
import type { ViewportSize } from "../lib/viewports"
import { AuthSkeleton } from "./AuthSkeleton"
import { AuthView } from "./AuthView"
import { ImageTabShell } from "./ImageTabShell"
import { ImageTabSkeleton } from "./ImageTabSkeleton"
import { NoCollectionsSkeleton } from "./NoCollectionsSkeleton"
import { NoCollectionsView } from "./NoCollectionsView"
import { PanelContentStage } from "./PanelContentStage"
import { PanelShell } from "./PanelShell"
import { PanelTabCrossfade } from "./PanelTabCrossfade"
import { SaveSuccessView } from "./SaveSuccessView"
import { syncStackEntrancePlayedUrls } from "./stack-image-entrance"
import { TAB_CONTENT_HEIGHT_PX } from "./tab-layout"
import { UrlImageToggle } from "./UrlImageToggle"
import { UrlTabShell } from "./UrlTabShell"
import { UrlTabSkeleton } from "./UrlTabSkeleton"

type PanelView = "auth" | "main"

type TabSuccessState = {
  boardId: string
  boardName: string
  imageCount?: number
}

type PanelAppProps = {
  onClose: () => void
  initialHint: BootstrapHint
}

export function PanelApp({ onClose, initialHint }: PanelAppProps) {
  const [view, setView] = useState<PanelView>(
    initialHint.skeleton === "auth" ? "auth" : "main",
  )
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootstrapSkeleton, setBootstrapSkeleton] = useState(
    initialHint.skeleton === "no-collections" ? "main" : initialHint.skeleton,
  )
  const [activeTab, setActiveTab] = useState<PanelTab>("url")
  const [boards, setBoards] = useState<ExtensionBoard[]>(initialHint.cachedBoards ?? [])
  const [tabUrl, setTabUrl] = useState("")
  const [tabTitle, setTabTitle] = useState("")
  const [metadataTitle, setMetadataTitle] = useState<string | undefined>()
  const [authError, setAuthError] = useState<string | null>(null)
  const [viewport, setViewport] = useState<ViewportSize>("desktop")
  const [selectedBoard, setSelectedBoard] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [imageSaveProgress, setImageSaveProgress] = useState<{ current: number; total: number } | null>(
    null,
  )
  const [successByTab, setSuccessByTab] = useState<Partial<Record<PanelTab, TabSuccessState>>>({})
  const [boardsError, setBoardsError] = useState<string | null>(null)

  const loadBoards = useCallback(async (): Promise<
    { ok: true; boards: ExtensionBoard[] } | { ok: false; error: string }
  > => {
    const response = await sendBackgroundMessage({ type: "GET_BOARDS" })
    if (response.ok) {
      setBoards(response.data.boards)
      setBoardsError(null)
      await setCachedBoards(response.data.boards)
      return { ok: true, boards: response.data.boards }
    }

    setBoards([])
    setBoardsError(response.error)
    return { ok: false, error: response.error }
  }, [])

  const loadTabInfo = useCallback(async () => {
    const response = await sendBackgroundMessage({ type: "GET_TAB_URL" })
    if (response.ok) {
      setTabUrl(response.data.url)
      setTabTitle(response.data.title)
    }
  }, [])

  const showAuthView = useCallback(() => {
    void clearCachedBoards()
    setBoards([])
    setBoardsError(null)
    setBootstrapSkeleton("auth")
    setIsBootstrapping(false)
    setView("auth")
    setSaveError(null)
    setSuccessByTab({})
  }, [])

  const handleAuthFailure = useCallback(
    async (error: string): Promise<boolean> => {
      if (!isAuthFailureMessage(error)) return false
      await sendBackgroundMessage({ type: "SIGN_OUT" })
      showAuthView()
      return true
    },
    [showAuthView],
  )

  const refreshMainData = useCallback(async (): Promise<
    { ok: true; boards: ExtensionBoard[] } | { ok: false; error: string }
  > => {
    const [boardsResult] = await Promise.all([loadBoards(), loadTabInfo()])
    if (boardsResult.ok) {
      setBootstrapSkeleton(bootstrapSkeletonFromBoards(boardsResult.boards))
    } else {
      await handleAuthFailure(boardsResult.error)
    }
    return boardsResult
  }, [handleAuthFailure, loadBoards, loadTabInfo])

  const bootstrap = useCallback(
    async (withSkeleton: boolean) => {
      if (withSkeleton) {
        setIsBootstrapping(true)
        setAuthError(null)
      }

      const authResponse = await sendBackgroundMessage({ type: "GET_AUTH_STATE" })
      if (!authResponse.ok) {
        if (withSkeleton) {
          setAuthError(authResponse.error)
        }
        showAuthView()
        return
      }

      const authState: AuthState = authResponse.data
      if (authState.status === "authenticated") {
        setView("main")
        if (withSkeleton) {
          setAuthError(null)
          setSaveError(null)
          setSuccessByTab({})
          setBoardsError(null)
          setBootstrapSkeleton("main")
        }

        await refreshMainData()
        if (withSkeleton) {
          setIsBootstrapping(false)
        }
        return
      }

      const connectResponse = await sendBackgroundMessage({ type: "CONNECT_FROM_TAB" })

      if (connectResponse.ok && connectResponse.data.connected) {
        setView("main")
        if (withSkeleton) {
          setAuthError(null)
          setSaveError(null)
          setSuccessByTab({})
          setBoardsError(null)
          setBootstrapSkeleton("main")
        }

        await refreshMainData()
        if (withSkeleton) {
          setIsBootstrapping(false)
        }
        return
      }

      showAuthView()
    },
    [handleAuthFailure, refreshMainData, showAuthView],
  )

  const enterMainView = useCallback(async () => {
    setView("main")
    setIsBootstrapping(true)
    setAuthError(null)
    setSaveError(null)
    setSuccessByTab({})
    setBoardsError(null)
    setBootstrapSkeleton("main")

    await refreshMainData()
    setIsBootstrapping(false)
  }, [refreshMainData])

  useEffect(() => {
    void bootstrap(true)
  }, [bootstrap])

  useEffect(() => {
    return subscribeToImageSelection((images) => {
      syncStackEntrancePlayedUrls(images.map((image) => image.url))
      setSelectedImages(images)
    })
  }, [])

  useEffect(() => {
    if (view !== "main" || isBootstrapping) {
      stopPickMode()
      return
    }

    if (activeTab === "image" && !saving) {
      startPickMode()
      return
    }

    stopPickMode()
  }, [activeTab, isBootstrapping, saving, view])

  useEffect(() => {
    if (!isSaveableTabUrl(tabUrl)) {
      setMetadataTitle(undefined)
      return
    }

    let cancelled = false
    const normalizedUrl = normalizeUrl(tabUrl)

    void fetchUrlMetadata(normalizedUrl).then((metadata) => {
      if (!cancelled) {
        setMetadataTitle(metadata.title)
      }
    })

    return () => {
      cancelled = true
    }
  }, [tabUrl])

  async function handleSignIn(email: string, password: string) {
    setAuthError(null)
    const response = await sendBackgroundMessage({ type: "SIGN_IN", email, password })
    if (!response.ok) {
      setAuthError(response.error)
      return
    }

    await clearCachedBoards()
    setSaveError(null)
    setSuccessByTab({})
    setBoardsError(null)

    // Stay on the real login form (AuthView "Signing in…") until data is ready —
    // don't re-enter bootstrap skeleton mode after the user already has the auth UI.
    const boardsResult = await refreshMainData()

    setView("main")
    setIsBootstrapping(false)

    if (!boardsResult.ok) {
      if (await handleAuthFailure(boardsResult.error)) {
        setAuthError("Sign in succeeded but your session could not be verified. Please try again.")
      }
    }
  }

  async function handleSaveUrl() {
    if (!selectedBoard || !isSaveableTabUrl(tabUrl)) return

    setSaveError(null)
    setSaving(true)

    const response = await sendBackgroundMessage({
      type: "SAVE_URL",
      url: tabUrl,
      viewport,
      boardId: selectedBoard,
      tabTitle: tabTitle || undefined,
    })

    setSaving(false)

    if (!response.ok) {
      if (await handleAuthFailure(response.error)) return
      setSaveError(response.error)
      return
    }

    const boardName =
      boards.find((board) => board.id === selectedBoard)?.name ?? "your collection"

    setSuccessByTab((prev) => ({
      ...prev,
      url: {
        boardId: selectedBoard,
        boardName,
      },
    }))
  }

  async function handleSaveImages() {
    if (!selectedBoard || selectedImages.length === 0) return

    setSaveError(null)
    setSaving(true)

    const failures: string[] = []
    let savedCount = 0
    const total = selectedImages.length

    for (let index = 0; index < selectedImages.length; index += 1) {
      const image = selectedImages[index]
      setImageSaveProgress({ current: index + 1, total })

      const response = await sendBackgroundMessage({
        type: "SAVE_IMAGE",
        imageUrl: image.url,
        boardId: selectedBoard,
        sourceName: image.filename.replace(/\.[^.]+$/, ""),
      })

      if (response.ok) {
        savedCount += 1
      } else {
        failures.push(response.error)
      }
    }

    setSaving(false)
    setImageSaveProgress(null)

    if (savedCount === 0) {
      const firstError = failures[0] ?? "Failed to save images"
      if (await handleAuthFailure(firstError)) return
      setSaveError(firstError)
      return
    }

    const boardName =
      boards.find((board) => board.id === selectedBoard)?.name ?? "your collection"

    clearImageSelection()
    stopPickMode()

    setSuccessByTab((prev) => ({
      ...prev,
      image: {
        boardId: selectedBoard,
        boardName,
        imageCount: savedCount,
      },
    }))
  }

  function handleRemoveImage(url: string) {
    removeImageFromSelection(url)
  }

  function handleTabChange(tab: PanelTab) {
    if (saving) return
    setSaveError(null)
    setActiveTab(tab)
  }

  const hasCollections = hasSelectableCollections(boards)

  const tabSuccess = successByTab[activeTab]
  const isSuccess = tabSuccess != null
  const targetContentHeight =
    !isSuccess &&
    ((activeTab === "url" && !saveError) || (activeTab === "image" && selectedImages.length === 0))
      ? TAB_CONTENT_HEIGHT_PX
      : undefined

  if (isBootstrapping) {
    if (bootstrapSkeleton === "auth") {
      return (
        <PanelShell onClose={onClose}>
          <AuthSkeleton />
        </PanelShell>
      )
    }

    if (bootstrapSkeleton === "no-collections") {
      return (
        <PanelShell onClose={onClose} contentTopGap={32} showBranding>
          <NoCollectionsSkeleton />
        </PanelShell>
      )
    }

    return (
      <PanelShell onClose={onClose} contentTopGap={16} showBranding>
        <div className="flex flex-col gap-8">
          <UrlImageToggle activeTab={activeTab} onChange={handleTabChange} />
          <PanelContentStage
            isSuccess={false}
            targetHeight={TAB_CONTENT_HEIGHT_PX}
            formMeasureKey={`bootstrap-${activeTab}`}
            form={
              <PanelTabCrossfade
                activeTab={activeTab}
                urlContent={<UrlTabSkeleton />}
                imageContent={<ImageTabSkeleton />}
              />
            }
            success={null}
          />
        </div>
      </PanelShell>
    )
  }

  if (view === "auth") {
    return (
      <PanelShell onClose={onClose}>
        <AuthView
          error={authError}
          onSignIn={handleSignIn}
        />
      </PanelShell>
    )
  }

  if (!hasCollections) {
    return (
      <PanelShell onClose={onClose} contentTopGap={32} showBranding>
        {boardsError ? (
          <div className="flex flex-col gap-4 py-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {boardsError}
            </div>
            <CtaTextButton className="w-full" onClick={() => void enterMainView()}>
              Try again
            </CtaTextButton>
          </div>
        ) : (
          <NoCollectionsView />
        )}
      </PanelShell>
    )
  }

  return (
    <PanelShell onClose={onClose} contentTopGap={16} showBranding>
      <div className="flex flex-col gap-8">
        <UrlImageToggle activeTab={activeTab} onChange={handleTabChange} />

        <PanelContentStage
          isSuccess={isSuccess}
          targetHeight={targetContentHeight}
          formMeasureKey={activeTab}
          form={
            <PanelTabCrossfade
              activeTab={activeTab}
              urlContent={
                <UrlTabShell
                  url={tabUrl}
                  title={tabTitle}
                  metadataTitle={metadataTitle}
                  boards={boards}
                  viewport={viewport}
                  selectedBoard={selectedBoard}
                  saving={saving}
                  saveError={saveError}
                  onViewportChange={setViewport}
                  onBoardChange={setSelectedBoard}
                  onSave={() => void handleSaveUrl()}
                />
              }
              imageContent={
                <ImageTabShell
                  selectedImages={selectedImages}
                  boards={boards}
                  selectedBoard={selectedBoard}
                  saving={saving}
                  saveProgress={imageSaveProgress}
                  saveError={saveError}
                  onBoardChange={setSelectedBoard}
                  onRemoveImage={handleRemoveImage}
                  onSave={() => void handleSaveImages()}
                />
              }
            />
          }
          success={
            tabSuccess ? (
              <SaveSuccessView
                boardId={tabSuccess.boardId}
                boardName={tabSuccess.boardName}
                saveType={activeTab}
                imageCount={tabSuccess.imageCount}
              />
            ) : null
          }
        />
      </div>
    </PanelShell>
  )
}
