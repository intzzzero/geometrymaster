import { Point } from '@/components/DrawingCanvas'

// 두 점 사이의 거리 계산
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

// 5각별의 꼭짓점(피크) 찾기
export function findStarPeaks(radii: number[]): number[] {
  const peaks: number[] = []
  const threshold = 0.1 // 최소 피크 기준
  
  for (let i = 2; i < radii.length - 2; i++) {
    const current = radii[i]
    const prev1 = radii[i-1]
    const prev2 = radii[i-2]
    const next1 = radii[i+1]
    const next2 = radii[i+2]
    
    // 연속된 5개 점에서 현재 점이 가장 높으면 피크
    if (current > prev1 && current > prev2 && current > next1 && current > next2) {
      const avgNeighbors = (prev1 + prev2 + next1 + next2) / 4
      if ((current - avgNeighbors) / current > threshold) {
        peaks.push(i)
      }
    }
  }
  
  return peaks
}

// 5각별 각도 간격 일관성 검증 (72도 간격)
export function calculateStarAngleConsistency(peaks: number[], points: Point[], center: Point): number {
  if (peaks.length < 3) return 0
  
  const angles: number[] = []
  
  for (let i = 0; i < peaks.length; i++) {
    const peakPoint = points[peaks[i]]
    const angle = Math.atan2(peakPoint.y - center.y, peakPoint.x - center.x)
    angles.push(angle)
  }
  
  // 각도를 정렬하고 간격 계산
  angles.sort((a, b) => a - b)
  
  const expectedAngleGap = (2 * Math.PI) / 5 // 72도 (5각별의 이론적 간격)
  let consistencyScore = 0
  let validGaps = 0
  
  for (let i = 0; i < angles.length; i++) {
    const currentAngle = angles[i]
    const nextAngle = angles[(i + 1) % angles.length]
    let angleGap = nextAngle - currentAngle
    
    if (angleGap < 0) angleGap += 2 * Math.PI // 마지막 간격 처리
    
    const gapDeviation = Math.abs(angleGap - expectedAngleGap)
    const gapAccuracy = Math.exp(-gapDeviation * 1.5) // 매우 완화된 평가
    
    consistencyScore += gapAccuracy
    validGaps++
  }
  
  return validGaps > 0 ? consistencyScore / validGaps : 0
}

// 5각별 대칭성 검증
export function calculateStarSymmetry(peaks: number[], points: Point[], center: Point): number {
  if (peaks.length < 5) return 0
  
  // 각 꼭짓점으로부터 중심까지의 거리 균등성
  const peakDistances = peaks.map(peakIndex => {
    const peakPoint = points[peakIndex]
    return distance(peakPoint, center)
  })
  
  const avgPeakDistance = peakDistances.reduce((sum, dist) => sum + dist, 0) / peakDistances.length
  
  let distanceDeviation = 0
  for (const dist of peakDistances) {
    distanceDeviation += Math.abs(dist - avgPeakDistance) / avgPeakDistance
  }
  
  const distanceConsistency = Math.max(0, 1 - distanceDeviation)
  
  return distanceConsistency
}