"use client"

import type React from "react"

import { useState, useRef, useMemo } from "react"

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight), items.length - 1)

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(items.length - 1, visibleEnd + overscan)

    return {
      visibleItems: items.slice(start, end + 1).map((item, index) => ({
        item,
        index: start + index,
      })),
      totalHeight: items.length * itemHeight,
      offsetY: start * itemHeight,
    }
  }, [items, itemHeight, scrollTop, containerHeight, overscan])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div
      ref={scrollElementRef}
      style={{ height: containerHeight, overflow: "auto" }}
      onScroll={handleScroll}
      className="virtual-scroll-container"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
