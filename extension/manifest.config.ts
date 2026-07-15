import { defineManifest } from "@crxjs/vite-plugin"

const curatorApiUrl = process.env.VITE_CURATOR_API_URL ?? "http://127.0.0.1:3000"

export default defineManifest({
  manifest_version: 3,
  name: "Curator",
  version: "1.0.5",
  description: "Save inspiration from any webpage to your Curator boards.",
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  action: {
    default_title: "Save to Curator",
    default_icon: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["activeTab", "storage", "scripting", "tabs", "cookies"],
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["assets/*"],
      matches: ["<all_urls>"],
    },
  ],
})

export { curatorApiUrl }
