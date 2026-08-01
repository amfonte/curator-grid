/**
 * SVG filter defs for the smoky dissolve. Mounted once in the root layout.
 * feTurbulence + displacement adds organic wisp edges on top of the CSS keyframes.
 */
export function SmokyDissolveDefs() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          id="smoky-dissolve-filter"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves="5"
            seed="8"
            result="noise"
          />
          <feDisplacementMap
            id="smoky-dissolve-displacement"
            in="SourceGraphic"
            in2="noise"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="1.2" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
