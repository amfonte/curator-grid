export type ItemType = "image" | "url"

export interface Item {
  id: string
  user_id: string
  type: ItemType
  file_url: string | null
  file_size: number | null
  mime_type: string | null
  width: number | null
  height: number | null
  original_url: string | null
  viewport_size: string
  screenshot_url?: string | null
  title: string | null
  description: string | null
  notes: string | null
  favicon_url: string | null
  domain: string | null
  iframe_blocked: boolean
  created_at: string
  updated_at: string
  boards?: Board[]
}

export interface Board {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  item_count?: number
}

export interface ItemBoard {
  item_id: string
  board_id: string
}
