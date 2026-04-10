"use client"

import type { SVGProps } from "react"
import { cn } from "@/lib/utils"

/**
 * Inline SVG assets for the Folder component (no img + object-cover).
 * Each component takes idPrefix so multiple Folder instances don't clash IDs.
 */

function prefixIds(idPrefix: string, ...ids: string[]) {
  return Object.fromEntries(ids.map((id) => [id, idPrefix + id]))
}

export function FolderUnion({
  idPrefix,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string }) {
  const p = prefixIds(idPrefix, "paint0_linear_0_7")
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 319 232"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        id="Union"
        d="M127.507 17.3507C128.833 19.7699 129.495 20.9795 130.444 21.8607C131.283 22.6402 132.279 23.2305 133.366 23.5917C134.595 24 135.974 24 138.732 24H306.2C310.68 24 312.921 24 314.632 24.8719C316.137 25.6389 317.361 26.8628 318.128 28.3681C319 30.0794 319 32.3196 319 36.8V219.2C319 223.68 319 225.921 318.128 227.632C317.361 229.137 316.137 230.361 314.632 231.128C312.921 232 310.68 232 306.2 232H12.8C8.31958 232 6.07937 232 4.36808 231.128C2.86278 230.361 1.63893 229.137 0.871948 227.632C0 225.921 0 223.68 0 219.2V12.8C0 8.31958 0 6.07937 0.871948 4.36808C1.63893 2.86278 2.86278 1.63893 4.36808 0.871948C6.07937 0 8.31958 0 12.8 0H110.418C113.177 0 114.556 0 115.784 0.40829C116.871 0.769473 117.868 1.35978 118.707 2.13929C119.655 3.02047 120.318 4.23007 121.643 6.64926L127.507 17.3507Z"
        fill={`url(#${p.paint0_linear_0_7})`}
      />
      <defs>
        <linearGradient
          id={p.paint0_linear_0_7}
          x1="159.5"
          y1="0"
          x2="159.5"
          y2="232"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--folder-union-top, #E6E6E6)" />
          <stop offset="1" stopColor="var(--folder-union-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderRect1({
  idPrefix,
  className,
  innerShadowAlphaScale = 1,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string; innerShadowAlphaScale?: number }) {
  const p = prefixIds(idPrefix, "filter0_i_0_13", "paint0_linear_0_13")
  const a = Math.max(0, Math.min(1, innerShadowAlphaScale))
  const innerShadowMatrix = `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${a} 0`
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 334.19 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g id="Rectangle_1" filter={`url(#${p.filter0_i_0_13})`}>
        <path
          d="M0.124098 13.3086C-0.0604305 8.6684 -0.152695 6.3483 0.692983 4.56778C1.43645 3.00244 2.6681 1.72084 4.20265 0.91576C5.94816 0 8.27011 0 12.914 0H321.276C325.92 0 328.242 0 329.987 0.91576C331.522 1.72084 332.753 3.00244 333.497 4.56778C334.342 6.3483 334.25 8.6684 334.066 13.3086L327.448 179.709C327.277 184.027 327.191 186.187 326.296 187.829C325.508 189.274 324.293 190.441 322.818 191.171C321.142 192 318.981 192 314.658 192H19.5313C15.2092 192 13.0481 192 11.3717 191.171C9.89629 190.441 8.68188 189.274 7.89411 187.829C6.999 186.187 6.91313 184.027 6.74138 179.709L0.124098 13.3086Z"
          fill={`url(#${p.paint0_linear_0_13})`}
        />
      </g>
      <defs>
        <filter
          id={p.filter0_i_0_13}
          x="0"
          y="0"
          width="334.19"
          height="192"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values={innerShadowMatrix} />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_0_13" />
        </filter>
        <linearGradient id={p.paint0_linear_0_13} x1="174.73" y1="0" x2="174.73" y2="192" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--folder-front-top, #E6E6E6)" />
          <stop offset="1" stopColor="var(--folder-front-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderRect2({
  idPrefix,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string }) {
  const p = prefixIds(idPrefix, "filter0_i_0_12", "paint0_linear_0_12")
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 341.754 184"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g id="Rectangle_1" filter={`url(#${p.filter0_i_0_12})`}>
        <path
          d="M0.237648 13.6078C-0.0616614 8.87453 -0.211316 6.5079 0.617427 4.68662C1.34577 3.08599 2.58123 1.76994 4.13271 0.942031C5.89805 0 8.26941 0 13.0121 0H328.742C333.485 0 335.856 0 337.622 0.942031C339.173 1.76994 340.409 3.08599 341.137 4.68662C341.966 6.5079 341.816 8.87453 341.517 13.6078L331.5 172.008C331.233 176.231 331.1 178.342 330.192 179.943C329.394 181.353 328.185 182.487 326.728 183.196C325.072 184 322.957 184 318.726 184H23.0286C18.7975 184 16.6819 184 15.0263 183.196C13.5688 182.487 12.3607 181.353 11.562 179.943C10.6547 178.342 10.5212 176.231 10.2541 172.008L0.237648 13.6078Z"
          fill={`url(#${p.paint0_linear_0_12})`}
        />
      </g>
      <defs>
        <filter
          id={p.filter0_i_0_12}
          x="0"
          y="0"
          width="341.754"
          height="184"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_0_12" />
        </filter>
        <linearGradient id={p.paint0_linear_0_12} x1="178.512" y1="0" x2="178.512" y2="184" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--folder-front-top, #E6E6E6)" />
          <stop offset="1" stopColor="var(--folder-front-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderRect3({
  idPrefix,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string }) {
  const p = prefixIds(idPrefix, "paint0_linear_0_10")
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 301 156"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path id="Rectangle_2" d="M0 0H301V156H0V0Z" fill={`url(#${p.paint0_linear_0_10})`} />
      <defs>
        <linearGradient
          id={p.paint0_linear_0_10}
          x1="150.5"
          y1="1.88988e-08"
          x2="150.5"
          y2="13"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--folder-back-top, #FFFFFF)" />
          <stop offset="1" stopColor="var(--folder-back-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderRect4({
  idPrefix,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string }) {
  const p = prefixIds(idPrefix, "paint0_linear_0_6")
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 305 152"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path id="Rectangle_2" d="M0 0H305V152H0V0Z" fill={`url(#${p.paint0_linear_0_6})`} />
      <defs>
        <linearGradient id={p.paint0_linear_0_6} x1="152.5" y1="0" x2="152.5" y2="12.6667" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--folder-back-top, #FFFFFF)" />
          <stop offset="1" stopColor="var(--folder-back-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderRect5({
  idPrefix,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string }) {
  const p = prefixIds(idPrefix, "paint0_linear_0_5")
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 309 152"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path id="Rectangle_2" d="M0 0H309V152H0V0Z" fill={`url(#${p.paint0_linear_0_5})`} />
      <defs>
        <linearGradient id={p.paint0_linear_0_5} x1="154.5" y1="0" x2="154.5" y2="12.6667" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--folder-back-top, #FFFFFF)" />
          <stop offset="1" stopColor="var(--folder-back-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderRect6({
  idPrefix,
  className,
  innerShadowAlphaScale = 1,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string; innerShadowAlphaScale?: number }) {
  const p = prefixIds(idPrefix, "filter0_i_0_4", "paint0_linear_0_4")
  const a = Math.max(0, Math.min(1, innerShadowAlphaScale))
  const innerShadowMatrix = `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${a} 0`
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      viewBox="0 0 334.19 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <g id="Rectangle_1" filter={`url(#${p.filter0_i_0_4})`}>
        <path
          d="M0.124098 13.3086C-0.0604305 8.6684 -0.152695 6.3483 0.692983 4.56778C1.43645 3.00244 2.6681 1.72084 4.20265 0.91576C5.94816 0 8.27011 0 12.914 0H321.276C325.92 0 328.242 0 329.987 0.91576C331.522 1.72084 332.753 3.00244 333.497 4.56778C334.342 6.3483 334.25 8.6684 334.066 13.3086L327.448 179.709C327.277 184.027 327.191 186.187 326.296 187.829C325.508 189.274 324.293 190.441 322.818 191.171C321.142 192 318.981 192 314.658 192H19.5313C15.2092 192 13.0481 192 11.3717 191.171C9.89629 190.441 8.68188 189.274 7.89411 187.829C6.999 186.187 6.91313 184.027 6.74138 179.709L0.124098 13.3086Z"
          fill={`url(#${p.paint0_linear_0_4})`}
        />
      </g>
      <defs>
        <filter
          id={p.filter0_i_0_4}
          x="0"
          y="0"
          width="334.19"
          height="192"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values={innerShadowMatrix} />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_0_4" />
        </filter>
        <linearGradient id={p.paint0_linear_0_4} x1="174.73" y1="0" x2="174.73" y2="192" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--folder-front-top, #E6E6E6)" />
          <stop offset="1" stopColor="var(--folder-front-bottom, #DBDBDB)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FolderLine({
  idPrefix,
  className,
  lineShadowOpacity = 0.8,
  ...props
}: SVGProps<SVGSVGElement> & { idPrefix: string; lineShadowOpacity?: number }) {
  const p = prefixIds(idPrefix, "filter0_d_0_11")
  const shadowA = Math.max(0, Math.min(1, lineShadowOpacity))
  const shadowMatrix = `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${shadowA} 0`
  return (
    <svg
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      viewBox="0 0 287 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", className)}
      {...props}
    >
      <g id="Line_3" filter={`url(#${p.filter0_d_0_11})`}>
        <line
          y1="0.5"
          x2="287"
          y2="0.5"
          stroke="var(--folder-line-stroke, var(--stroke-0, #B3B3B3))"
          strokeOpacity="var(--folder-line-stroke-opacity, 1)"
        />
      </g>
      <defs>
        <filter
          id={p.filter0_d_0_11}
          x="0"
          y="0"
          width="287"
          height="2"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values={shadowMatrix} />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_11" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_11" result="shape" />
        </filter>
      </defs>
    </svg>
  )
}
