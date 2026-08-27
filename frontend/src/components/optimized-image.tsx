import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  className?: string
  placeholderColor?: string
  lazy?: boolean
}

/**
 * Optimized image component with lazy loading and blur-up effect
 * Fixes issue #1212: Image optimization pipeline
 */
export function OptimizedImage({
  src,
  alt,
  className,
  placeholderColor = "bg-muted",
  lazy = true,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!lazy) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "50px", // Start loading 50px before visible
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder */}
      {!isLoaded && (
        <div
          className={cn(
            "absolute inset-0 animate-pulse",
            placeholderColor
          )}
        />
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  )
}

/**
 * Preload critical images
 */
export function preloadImage(src: string) {
  const link = document.createElement("link")
  link.rel = "preload"
  link.as = "image"
  link.href = src
  document.head.appendChild(link)
}

/**
 * Preload multiple images
 */
export function preloadImages(srcs: string[]) {
  srcs.forEach(preloadImage)
}
