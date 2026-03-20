# Product Requirements Document: Personal Inspiration Board

## Project Overview

A private, ad-free inspiration gathering and organization tool that allows users to save, organize, and view images, videos, and live website previews in a customizable masonry grid layout.

---

## Goals

- Create a clean, distraction-free alternative to Pinterest for personal use
- Support multiple content types: images, videos, and live website URLs
- Provide flexible organization through boards, tags, and search
- Maintain user control over visual presentation and layout
- Keep costs minimal with free-tier database and storage solutions

## Non-Goals (MVP)

- Public sharing or social features
- Collaboration or multi-user editing
- AI-powered recommendations or auto-tagging
- Browser extension (future enhancement)
- Offline/PWA functionality
- Mobile native apps

---

## User Stories

1. **As a user**, I want to create an account so my inspiration board is private and accessible only to me
2. **As a user**, I want to upload images and videos so I can save visual inspiration from my device
3. **As a user**, I want to save website URLs with custom viewport sizes so I can preview live sites at different breakpoints
4. **As a user**, I want to organize items into boards/collections so I can group related inspiration
5. **As a user**, I want to add tags and notes to items so I can add context and improve searchability
6. **As a user**, I want to search and filter my items so I can quickly find specific inspiration
7. **As a user**, I want to adjust preview sizes in the grid so I can see more detail for important items
8. **As a user**, I want to export my data so I'm never locked into the platform

---

## Feature Requirements

### 1. Authentication & Account Management

**Priority:** P0 (MVP)

- Email/password authentication
- Private accounts by default (no public profiles)
- Password reset functionality
- Account deletion with data export option

**Technical Notes:**
- Use Supabase Auth for authentication
- Row Level Security (RLS) to ensure users only see their own data

---

### 2. Content Upload & Management

**Priority:** P0 (MVP)

#### 2.1 Image Upload
- Drag-and-drop or click to upload
- Supported formats: JPG, PNG, GIF, WebP
- Auto-compress to WebP on upload (max 1920px width, 85% quality)
- Store original filename and upload date as metadata

#### 2.2 URL Saving
- Input field for URL
- Viewport size selector: Mobile (393×852), Tablet (768×1024), Desktop (1440×900), Custom
- Store URL metadata: title, description, favicon, domain
- Display live iframe directly in grid (no screenshots needed for storage optimization)
- For sites that block iframe embedding: Show favicon + title + "Open in new tab" button as fallback

**Technical Notes:**
- No screenshot generation needed (space optimization)
- Iframe loads live on-demand in grid
- Iframe sandbox attributes for security
- Detect iframe blocking with error handling

---

### 3. Organization System

**Priority:** P0 (MVP)

#### 3.1 Boards/Collections
- Create unlimited boards
- Rename and delete boards
- Each item can belong to multiple boards
- No default collection; empty state shows inspirational quote and “Create your first collection”

#### 3.2 Tags
- Create custom tags
- Multi-tag items (unlimited tags per item)
- Auto-suggest existing tags while typing
- Rename tags globally (updates all items)
- Delete tags (removes from all items)

#### 3.3 Notes/Annotations
- Add text notes to any item (max 500 characters)
- Edit/delete notes
- Notes included in search

---

### 4. Viewing & Layout

**Priority:** P0 (MVP)

#### 4.1 Masonry Grid View
- Responsive masonry layout (CSS Grid or library like react-masonry-css)
- Maintains aspect ratios
- **Displays both images AND live iframes inline** (no modals)
- Lazy loading for performance
- Smooth transitions when resizing

#### 4.2 Preview Size Control (Column Count Slider)
- Slider value = number of columns (items per row): 1 through 6
- CSS implementation: `grid-template-columns: repeat(N, 1fr)` where N = slider value
- Dragging left (1) = largest items (full-width), dragging right (6) = most items per row
- All items fill their column width proportionally (no pixel values)
- Item cards do not stretch past their imported size; when the column is wider, the card is centered (see 4.3)
- Images downscale to fit column but never upscale past native resolution
- URL previews downscale to fit column but never upscale past their saved viewport size (Mobile 393×852, Tablet 768×1024, Desktop 1440×900)
- **Default value: 6** (most items per row, compact view)
- Persists user preference in local storage
- Visual feedback: numbered labels (1→2→3→4→5→6)

#### 4.3 Inline Display Behavior
- **Item container (card):** The wrapper for each item is limited to the same max width as its content (image native width or URL viewport width). When the masonry column is wider than that max, the card does not stretch; it remains at imported size and is centered in the column.
- **Images:** Fill column width (downscale only, never upscale past native resolution)
- **URLs with iframe support:** Live iframe inline in grid; fills column width when smaller than saved viewport, but never upscales past imported viewport size (Mobile 393×852, Tablet 768×1024, Desktop 1440×900)
- **URLs with iframe blocked:** Display favicon + title + "Open in new tab" button, fills column width
- Hover interactions: Show metadata overlay (tags, notes, boards)
- Click interactions: Edit mode (update tags, notes, boards, delete)

---

### 6. Bulk Actions

**Priority:** P0 (MVP)

- Select multiple items via checkbox mode
- Bulk add/remove tags
- Bulk move to board(s)
- Bulk delete with confirmation
- "Select all" and "Deselect all" options
- Selected count indicator

---

### 5. Search & Filtering

**Priority:** P0 (MVP)

- **Search bar:** Full-text search across titles, notes, tags, URLs
- **Filter by board:** Dropdown to select board
- **Filter by tag:** Multi-select tag filter
- **Filter by content type:** All, Images, Videos, URLs
- **Sort options:** Date added (newest/oldest), Title (A-Z)
- Clear all filters button

**Technical Notes:**
- PostgreSQL full-text search using Supabase
- Debounced search input (300ms)

---

### 7. Data Management

**Priority:** P1 (Post-MVP - Export only)

#### 7.1 Duplicate Detection
- Check URL before saving (warn if exists)
- Hash-based image duplicate detection (optional, future)

---

## Technical Architecture

### Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Backend & Database:**
- Supabase (PostgreSQL + Auth + Storage for metadata)
- Vercel Blob (file storage for images/videos)

**Image Processing:**
- Sharp (server-side image compression to WebP)

**URL Preview:**
- Microlink API or Urlbox (screenshot generation)
- OR use Puppeteer on Vercel Serverless Functions (if budget allows)

**Deployment:**
- Vercel

---

## Data Models

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Boards Table
```sql
boards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Tags Table
```sql
tags (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  created_at TIMESTAMP
)
```

### Items Table
```sql
items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT, -- 'image' | 'video' | 'url'
  
  -- File storage
  file_url TEXT, -- Vercel Blob URL for images/videos
  thumbnail_url TEXT, -- For videos and URLs
  
  -- URL specific
  original_url TEXT, -- For URL type
  viewport_size TEXT, -- 'mobile' | 'tablet' | 'desktop' | custom px
  
  -- Metadata
  title TEXT,
  description TEXT,
  notes TEXT,
  favicon_url TEXT,
  
  -- File info
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Item_Boards (Many-to-Many)
```sql
item_boards (
  item_id UUID REFERENCES items(id),
  board_id UUID REFERENCES boards(id),
  PRIMARY KEY (item_id, board_id)
)
```

### Item_Tags (Many-to-Many)
```sql
item_tags (
  item_id UUID REFERENCES items(id),
  tag_id UUID REFERENCES tags(id),
  PRIMARY KEY (item_id, tag_id)
)
```

---

## User Flows

### Flow 1: New User Onboarding
1. User lands on homepage (unauthenticated)
2. User clicks "Sign Up"
3. User enters email and password
4. User is redirected to empty dashboard with onboarding tooltip
5. Tooltip explains "Click + to add your first item"

### Flow 2: Upload Image
1. User clicks "+ Add Item" button
2. Modal opens with tabs: Upload | URL
3. User drags image into upload zone
4. Image compresses to WebP (loading indicator)
5. Form appears: Select board(s), Add tags, Add notes
6. User clicks "Save"
7. Modal closes, item appears in grid

### Flow 3: Save URL
1. User clicks "+ Add Item" button
2. User selects "URL" tab
3. User pastes URL
4. User selects viewport size (default: Desktop)
5. System fetches metadata and generates screenshot (loading state)
6. Preview appears in modal
7. User adds board(s), tags, notes
8. User clicks "Save"
9. Modal closes, item appears in grid with screenshot preview

### Flow 4: View URL in Iframe
1. User clicks URL item in grid
2. Detail modal opens showing screenshot preview
3. User clicks "View Live Site" toggle
4. Iframe loads at saved viewport size
5. User can interact with live site
6. User can toggle back to screenshot or close modal

### Flow 5: Search & Filter
1. User types query in search bar
2. Grid updates in real-time (debounced)
3. User clicks "Filter" button
4. Filter panel slides in from right
5. User selects board, tags, content type
6. Grid updates to show filtered results
7. User sees "X results" count and "Clear filters" option

---

## Storage & Cost Analysis

### Free Tier Limits

**Supabase Free Tier:**
- 500MB database storage
- 1GB file storage (for thumbnails/screenshots)
- 50,000 monthly active users
- Unlimited API requests

**Vercel Blob Free Tier:**
- 500MB storage
- 5GB bandwidth/month

### Storage Estimates

**Per Item:**
- Metadata in DB: ~2KB
- Compressed image (WebP): 100-500KB avg
- URL metadata: <1KB (just text, iframe loads live - NO screenshots stored)

**Free Tier Capacity (MVP - Images + URLs only):**
- **Supabase Database (500MB):** ~250,000 items of metadata (more than enough)
- **Supabase Storage (1GB):** ~2,000-10,000 compressed images
- **URLs:** Unlimited (no file storage, just database entries)
- **Total realistic capacity:** 2,000-10,000 images + unlimited URLs

### Paid Upgrade Path
- Supabase Pro: $25/mo (8GB database, 100GB files)
- Vercel Blob: $0.15/GB storage, $0.20/GB bandwidth
- **Recommended user pricing:** $5-10/mo for unlimited storage after free tier

---

## MVP Scope (Phase 1)

**Timeline: 2-3 weeks**

✅ **Must Have:**
- Authentication (sign up, login, logout)
- Upload images with WebP compression
- Save URLs with live iframe viewing (inline, no screenshots)
- Iframe fallback for blocked sites (favicon + title + open button)
- Create/edit/delete boards
- Add/edit/delete tags
- Add notes to items
- Masonry grid view with inline iframes (no modals/detail pages)
- Column count slider (1-6) where value = items per row in masonry grid
- Search functionality
- Filter by board and content type
- Hover/click for metadata editing (tags, notes, boards, delete)
- Bulk actions (multi-select, bulk tag, bulk move, bulk delete)
- Basic responsive design

❌ **Exclude from MVP:**
- Video upload (Phase 2)
- Export functionality (Phase 2)
- Advanced filters (multi-tag AND/OR, date range) (Phase 2)
- Browser extension (Phase 3)
- Collaboration features (Future)

---

## Phase 2: Enhanced Features (Post-MVP)

**Timeline: 2-3 weeks after MVP launch**

- Video upload support (MP4, WebM, MOV with compression)
- Export data (JSON)
- Duplicate URL detection with warnings
- Advanced tag filtering (AND/OR logic)
- Keyboard shortcuts (Ctrl+K search, arrow navigation)
- Drag-and-drop reorganization within grid

---

## Phase 3: Nice-to-Haves (Future)

- Browser extension for quick-save
- Import from Pinterest/bookmarks
- Color extraction and filtering
- Shareable public boards (optional per-board setting)
- Mobile app (React Native)
- Custom domains for public boards

---

## Success Metrics

**Usage Metrics:**
- Daily active items added
- Average items per user
- Search usage rate
- Most-used features (tags vs boards vs search)

**Technical Metrics:**
- Image compression ratio (target: 70% size reduction)
- Page load time (target: <2s)
- Storage usage per user

**User Satisfaction:**
- Storage capacity before hitting limits
- Feature requests (track for prioritization)

---

## Open Questions & Decisions Needed

1. **URL Screenshots:** Use paid API (Microlink: $29/mo for 10k) or self-host with Puppeteer?
   - **Recommendation:** Start with Microlink, migrate to self-hosted if usage grows

2. **Video Storage:** Store in Blob or use Supabase Storage?
   - **Recommendation:** Vercel Blob for consistency with images

3. **Default Board:** Auto-create "All Items" board or require users to create boards?
   - **Recommendation:** No default board; show inspirational quote and “Create your first collection” when empty

4. **Tag UI:** Inline tags or separate panel?
   - **Recommendation:** Inline tags below items, with autocomplete dropdown

5. **Mobile Experience:** Build responsive web first or mobile app?
   - **Recommendation:** Responsive web only for MVP

---

## UI/UX Considerations

### Key Screens

1. **Login/Signup:** Clean, centered form
2. **Dashboard:** Full-width masonry grid with top navigation
3. **Top Navigation:** Logo, Search bar, Filter button, Column count slider (1-6), + Add button, User menu
4. **Left Sidebar:** Boards list with counts, Tags list (collapsible)
5. **Add Item Modal:** Tabbed interface (Upload / URL), form fields, preview
6. **Item Detail Modal:** Full-screen lightbox with metadata sidebar
7. **Settings:** Account info, export data, delete account

### Design Principles

- **Minimal chrome:** Content-first, UI fades into background
- **Fast interactions:** Instant feedback, optimistic updates
- **Keyboard-friendly:** Tab navigation, Enter to submit, Esc to close
- **Accessibility:** ARIA labels, keyboard navigation, screen reader support
- **Performance:** Lazy loading, image optimization, debounced search

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| URL screenshot service costs | High | Use free tier initially, add user limits if needed |
| Storage limits hit quickly | Medium | Aggressive WebP compression, monitor usage |
| Iframe security issues | High | Use sandbox attributes, CSP headers |
| User expects Pinterest features | Low | Clear positioning as "minimal personal tool" |
| Database query performance | Medium | Add indexes, implement pagination |

---

## Next Steps

1. **Design Phase:** Create wireframes and design system (1-2 days)
2. **Database Setup:** Configure Supabase with RLS policies (1 day)
3. **Core Development:** Build MVP features (10-12 days)
4. **Testing:** Manual testing and bug fixes (2-3 days)
5. **Deploy:** Production deployment and monitoring setup (1 day)
6. **Iterate:** Gather personal usage feedback and build Phase 2

---

## Appendix: Technical Implementation Notes

### Image Compression Strategy
```typescript
// Server-side API route
import sharp from 'sharp';

export async function compressImage(file: File) {
  const buffer = await file.arrayBuffer();
  const compressed = await sharp(Buffer.from(buffer))
    .resize(1920, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  return compressed;
}
```

### URL Metadata Extraction
```typescript
// Use Microlink API or custom scraper
export async function fetchUrlMetadata(url: string) {
  const response = await fetch(`https://api.microlink.io?url=${url}`);
  const data = await response.json();
  return {
    title: data.data.title,
    description: data.data.description,
    image: data.data.screenshot.url,
    favicon: data.data.logo.url
  };
}
```

### RLS Policy Example
```sql
-- Users can only see their own items
CREATE POLICY "Users can view own items"
ON items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
ON items FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Owner:** [Your Name]
