'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface Point {
  x: number
  y: number
}

interface DrawingCanvasProps {
  width?: number
  height?: number
  strokeWidth?: number
  strokeColor?: string
  backgroundColor?: string
  onDrawingComplete?: (path: Point[]) => void
  onDrawingChange?: (path: Point[]) => void
  disabled?: boolean
  fullScreen?: boolean
}

export default function DrawingCanvas({
  width = 400,
  height = 400,
  strokeWidth = 3,
  strokeColor = '#3182f6',
  backgroundColor = '#ffffff',
  onDrawingComplete,
  onDrawingChange,
  disabled = false,
  fullScreen = false
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [allPaths, setAllPaths] = useState<Point[][]>([])
  const [canvasSize, setCanvasSize] = useState({ width, height })
  const [lastCompletedPathLength, setLastCompletedPathLength] = useState(0)

  // fullScreen 모드일 때 화면 크기 감지
  useEffect(() => {
    if (!fullScreen) return

    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [fullScreen])

  // Canvas 초기화
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 고해상도 지원을 위한 설정
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth

    // 배경 초기화
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [width, height, strokeColor, strokeWidth, backgroundColor, fullScreen, canvasSize.width, canvasSize.height])

  // onDrawingChange 콜백 처리
  useEffect(() => {
    if (currentPath.length > 1) {
      onDrawingChange?.(currentPath)
    }
  }, [currentPath, onDrawingChange])

  // onDrawingComplete 콜백 처리 - 새로운 경로가 완성되었을 때만 호출
  useEffect(() => {
    if (!isDrawing && allPaths.length > lastCompletedPathLength) {
      const lastPath = allPaths[allPaths.length - 1]
      if (lastPath.length > 1) {
        setLastCompletedPathLength(allPaths.length)
        onDrawingComplete?.(lastPath)
      }
    }
  }, [isDrawing, allPaths, lastCompletedPathLength, onDrawingComplete])

  // 좌표 변환 함수
  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [])

  // 그리기 시작
  const startDrawing = useCallback((point: Point) => {
    if (disabled) return
    
    setIsDrawing(true)
    setCurrentPath([point])
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }, [disabled])

  // 그리기 중
  const continueDrawing = useCallback((point: Point) => {
    if (!isDrawing || disabled) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setCurrentPath(prev => [...prev, point])

    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }, [isDrawing, disabled])

  // 그리기 종료
  const endDrawing = useCallback(() => {
    if (!isDrawing) return

    setIsDrawing(false)
    
    if (currentPath.length > 1) {
      setAllPaths(prev => [...prev, currentPath])
    }
    
    setCurrentPath([])
  }, [isDrawing, currentPath])

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    startDrawing(point)
  }, [getCanvasPoint, startDrawing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    continueDrawing(point)
  }, [getCanvasPoint, continueDrawing])

  const handleMouseUp = useCallback(() => {
    endDrawing()
  }, [endDrawing])

  // 터치 이벤트 핸들러 (네이티브 이벤트 리스너용)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault()
    }
    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    startDrawing(point)
  }, [getCanvasPoint, startDrawing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault()
    }
    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    continueDrawing(point)
  }, [getCanvasPoint, continueDrawing])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault()
    }
    endDrawing()
  }, [endDrawing])

  // 캔버스 지우기
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    setAllPaths([])
    setCurrentPath([])
    setIsDrawing(false)
    setLastCompletedPathLength(0)
  }, [backgroundColor])

  // 네이티브 터치 이벤트 리스너 추가 (passive: false로 preventDefault 허용)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const actualWidth = fullScreen ? canvasSize.width : width
  const actualHeight = fullScreen ? canvasSize.height : height

  return (
    <div className={`relative ${fullScreen ? 'fixed inset-0 z-10' : ''}`}>
      <canvas
        ref={canvasRef}
        className={`${
          fullScreen 
            ? 'w-full h-full' 
            : 'border-2 border-dashed border-[--color-toss-gray-300] rounded-[--radius-toss]'
        } bg-white ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'
        }`}
        style={{ 
          width: actualWidth, 
          height: actualHeight,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* 컨트롤 버튼들 - fullScreen 모드에서는 숨김 */}
      {!fullScreen && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={clearCanvas}
            disabled={disabled || allPaths.length === 0}
            className="btn-secondary text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      )}
      
      {/* 안내 텍스트 - fullScreen 모드에서는 더 큰 텍스트 */}
      {allPaths.length === 0 && !isDrawing && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: fullScreen ? '100vh' : `${actualHeight}px`
          }}
        >
          <div className={`text-center text-[--color-toss-gray-500] ${fullScreen ? 'text-lg' : ''}`}>
            <p className={`font-medium mb-1 ${fullScreen ? 'text-xl mb-3' : 'text-sm'}`}>
              {disabled ? 'Drawing is disabled' : 'Draw a shape here'}
            </p>
            <p className={fullScreen ? 'text-base' : 'text-xs'}>
              {disabled ? '' : 'You can draw with mouse or touch'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// 컴포넌트와 함께 유틸리티 함수들도 export
export { type Point }