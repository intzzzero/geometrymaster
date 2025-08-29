import { Point } from '@/components/DrawingCanvas'
import { findStarPeaks, calculateStarAngleConsistency, calculateStarSymmetry } from './star-helper-functions'

// 도형별 채점 결과 인터페이스
export interface ScoringResult {
  score: number // 0.000-100.000점 (소수점 3자리)
  feedback: string
  details: {
    accuracy: number
    smoothness: number
    completeness: number
  }
}

// 두 점 사이의 거리 계산
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

// 점들의 중심점 계산
function getCenterPoint(points: Point[]): Point {
  const sum = points.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y
  }), { x: 0, y: 0 })
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  }
}

// 원주율 기반 정밀 원형도 계산
function calculateCircularity(points: Point[]): number {
  if (points.length < 15) return 0
  
  const center = getCenterPoint(points)
  const radii = points.map(point => distance(point, center))
  const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length
  
  // 반지름 일관성 계산 (더 정밀하게)
  const radiusVariance = radii.reduce((sum, r) => sum + (r - avgRadius) ** 2, 0) / radii.length
  const radiusStdDev = Math.sqrt(radiusVariance)
  const radiusConsistency = Math.max(0, 1 - (radiusStdDev / avgRadius) * 0.8) // 매우 완화된 반지름 일관성 평가
  
  // 둘레 계산 (연속된 점들 사이의 거리의 합)
  let perimeter = 0
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += distance(points[i], points[i + 1])
  }
  if (points.length > 2) {
    perimeter += distance(points[points.length - 1], points[0])
  }
  
  // 이론적 원의 둘레 (2πr)
  const theoreticalCircumference = 2 * Math.PI * avgRadius
  
  // 원주율 정확도 (핵심 지표) - 매우 정밀하게 측정
  const diameter = avgRadius * 2
  const actualPi = perimeter / diameter
  const piError = Math.abs(actualPi - Math.PI) / Math.PI
  
  // 원주율 정확도를 지수적으로 평가 (매우 완화됨)
  const piAccuracy = Math.exp(-piError * 3) // 오차가 작을수록 점진적으로 높은 점수
  
  // 둘레 비율 정확도
  const circumferenceRatio = Math.min(perimeter, theoreticalCircumference) / Math.max(perimeter, theoreticalCircumference)
  
  // 최종 원형도 = 원주율 정확도 중심 (85%), 반지름 일관성 (10%), 둘레 비율 (5%)
  return Math.min(1, piAccuracy * 0.85 + radiusConsistency * 0.10 + circumferenceRatio * 0.05)
}

// 경로의 연속성/부드러움 측정
function calculateSmoothness(points: Point[]): number {
  if (points.length < 3) return 0
  
  let totalAngleChange = 0
  let angleChanges = 0
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    
    // 벡터 계산
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }
    
    // 각도 계산
    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)
    
    let angleDiff = Math.abs(angle2 - angle1)
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff
    }
    
    totalAngleChange += angleDiff
    angleChanges++
  }
  
  if (angleChanges === 0) return 0
  
  const avgAngleChange = totalAngleChange / angleChanges
  
  // 부드러운 곡선일수록 각도 변화가 일정해야 함
  return Math.max(0, 1 - avgAngleChange / Math.PI)
}

// 원의 완전성 측정 (시작점과 끝점이 얼마나 가까운지)
function calculateCompleteness(points: Point[]): number {
  if (points.length < 10) return 0
  
  const start = points[0]
  const end = points[points.length - 1]
  const center = getCenterPoint(points)
  
  const avgRadius = points.reduce((sum, point) => 
    sum + distance(point, center), 0) / points.length
  
  const closingDistance = distance(start, end)
  
  // 닫힘 정도를 평균 반지름 대비로 계산
  const completeness = Math.max(0, 1 - (closingDistance / avgRadius))
  
  return completeness
}

// 원 채점 알고리즘
export function scoreCircle(points: Point[]): ScoringResult {
  if (points.length < 10) {
    return {
      score: 0,
      feedback: "The line is too short. Try drawing a longer circle.",
      details: {
        accuracy: 0,
        smoothness: 0,
        completeness: 0
      }
    }
  }
  
  const circularity = calculateCircularity(points)
  const smoothness = calculateSmoothness(points)
  const completeness = calculateCompleteness(points)
  
  // 원주율 기반 초정밀 채점 - 소수점 3자리 정확도
  const accuracy = circularity
  const rawScore = (
    accuracy * 0.97 +        // 정확도(원주율) 97%
    smoothness * 0.02 +      // 부드러움 2% 
    completeness * 0.01      // 완전성 1%
  )
  
  // 소수점 3자리 정밀 점수 계산
  let finalScore = rawScore * 100
  
  // 원주율 정확도에 따른 매우 완화된 점수 조정
  if (accuracy < 0.05) {
    finalScore = Math.min(finalScore, 15.000)   // 매우 낮은 정확도
  } else if (accuracy < 0.1) {
    finalScore = Math.min(finalScore, 30.000)   // 낮은 정확도
  } else if (accuracy < 0.2) {
    finalScore = Math.min(finalScore, 50.000)   // 보통 이하 정확도
  } else if (accuracy < 0.4) {
    finalScore = Math.min(finalScore, 70.000)   // 보통 정확도
  } else if (accuracy < 0.6) {
    finalScore = Math.min(finalScore, 85.000)   // 높은 정확도
  } else if (accuracy < 0.8) {
    finalScore = Math.min(finalScore, 95.000)   // 매우 높은 정확도
  }
  // accuracy >= 0.8일 때만 95점 이상 가능
  
  let feedback = ""
  if (finalScore >= 99.000) {
    feedback = "Perfect circle! Very close to π accuracy! 🎉"
  } else if (finalScore >= 95.000) {
    feedback = "Excellent circle! High π accuracy! 👏"
  } else if (finalScore >= 85.000) {
    feedback = "Good circle! Try drawing it a bit more accurately."
  } else if (finalScore >= 70.000) {
    feedback = "Decent circle. Try making it more round."
  } else if (finalScore >= 50.000) {
    feedback = "Close to a circle shape but needs improvement."
  } else {
    feedback = "Try again! Draw a more round circle."
  }
  
  return {
    score: Number(Math.min(100.000, Math.max(0.000, finalScore)).toFixed(3)),
    feedback,
    details: {
      accuracy: Math.round(accuracy * 100),
      smoothness: Math.round(smoothness * 100),
      completeness: Math.round(completeness * 100)
    }
  }
}

// 5각별 정밀 채점 알고리즘
export function scoreStar(points: Point[]): ScoringResult {
  if (points.length < 15) {
    return {
      score: 0.000,
      feedback: "The line is too short. Try drawing a bigger star.",
      details: {
        accuracy: 0,
        smoothness: 0,
        completeness: 0
      }
    }
  }

  const center = getCenterPoint(points)
  const smoothness = calculateSmoothness(points)
  
  // 별의 특징: 중심에서의 거리 변화 패턴 분석
  const radii = points.map(point => distance(point, center))
  const maxRadius = Math.max(...radii)
  const minRadius = Math.min(...radii)
  
  // 별의 안쪽/바깥쪽 반지름 비율 (황금비율 근사: 약 0.618)
  const radiusRatio = minRadius / maxRadius
  const idealRatio = 0.618 // 황금비율 (진짜 5각별의 이론적 비율)
  const ratioAccuracy = Math.exp(-Math.abs(radiusRatio - idealRatio) * 2) // 매우 완화된 평가
  
  // 5각별 꼭짓점 감지 (정확하게 5개의 피크 찾기)
  const starPeaks = findStarPeaks(radii)
  const peakScore = starPeaks.length === 5 ? 1 : Math.max(0, 1 - Math.abs(starPeaks.length - 5) / 5)
  
  // 각 꼭짓점 간의 각도 간격 검증 (72도 간격)
  const angleConsistency = calculateStarAngleConsistency(starPeaks, points, center)
  
  // 5각별 대칭성 검증
  const starSymmetry = calculateStarSymmetry(starPeaks, points, center)
  
  const completeness = calculateCompleteness(points)
  
  // 5각별 정확도 계산 - 반지름 비율과 각도 간격이 핵심
  const accuracy = (
    peakScore * 0.20 +         // 5개 꼭짓점 존재 여부
    ratioAccuracy * 0.35 +     // 황금비율 정확도 (핵심)
    angleConsistency * 0.35 +  // 72도 간격 정확도 (핵심)
    starSymmetry * 0.10        // 대칭성
  )
  
  // 소수점 3자리 정밀 점수 계산
  let rawScore = (accuracy * 0.80 + smoothness * 0.12 + completeness * 0.08) * 100
  
  // 5각별 정확도에 따른 매우 완화된 점수 조정
  if (peakScore < 0.2 || ratioAccuracy < 0.02) {
    rawScore = Math.min(rawScore, 15.000)    // 기본 별 모양도 안 됨
  } else if (ratioAccuracy < 0.08 || angleConsistency < 0.05) {
    rawScore = Math.min(rawScore, 35.000)    // 별 모양이지만 5각별과 거리 있음
  } else if (ratioAccuracy < 0.2 || angleConsistency < 0.1) {
    rawScore = Math.min(rawScore, 55.000)    // 어느 정도 5각별 형태
  } else if (ratioAccuracy < 0.4 || angleConsistency < 0.3) {
    rawScore = Math.min(rawScore, 75.000)    // 좋은 5각별
  } else if (ratioAccuracy < 0.6 || angleConsistency < 0.5) {
    rawScore = Math.min(rawScore, 90.000)    // 매우 좋은 5각별
  } else if (ratioAccuracy < 0.8 || angleConsistency < 0.7) {
    rawScore = Math.min(rawScore, 95.000)    // 거의 완벽한 5각별
  }
  // ratioAccuracy >= 0.8 && angleConsistency >= 0.7일 때만 95점 이상 가능
  
  const finalScore = rawScore
  
  let feedback = ""
  if (finalScore >= 99.000) {
    feedback = "Perfect 5-pointed star! Golden ratio and angle spacing are very accurate! ⭐️"
  } else if (finalScore >= 95.000) {
    feedback = "Excellent 5-pointed star! Ratio and angles are very accurate! 👏"
  } else if (finalScore >= 85.000) {
    feedback = "Good 5-pointed star! Try making the points a bit sharper."
  } else if (finalScore >= 70.000) {
    feedback = "Decent star. Try making the 5 points more pointed."
  } else if (finalScore >= 50.000) {
    feedback = "Close to a star shape but needs improvement as a 5-pointed star."
  } else {
    feedback = "Try again! Draw a sharp star with 5 pointed tips."
  }
  
  return {
    score: Number(Math.min(100.000, Math.max(0.000, finalScore)).toFixed(3)),
    feedback,
    details: {
      accuracy: Math.round(accuracy * 100),
      smoothness: Math.round(smoothness * 100),
      completeness: Math.round(completeness * 100)
    }
  }
}

// 정사각형 정밀 채점 알고리즘
export function scoreSquare(points: Point[]): ScoringResult {
  if (points.length < 12) {
    return {
      score: 0.000,
      feedback: "The line is too short. Try drawing a bigger square.",
      details: {
        accuracy: 0,
        smoothness: 0,
        completeness: 0
      }
    }
  }

  // 코너 감지 (각도 변화가 큰 지점들)
  const corners = findCorners(points)
  const cornerScore = corners.length === 4 ? 1 : Math.max(0, 1 - Math.abs(corners.length - 4) / 4)
  
  // 직선성 측정 (각 변이 얼마나 직선에 가까운지)
  const straightness = calculateStraightness(points, corners)
  
  // 직각 측정 (코너들이 얼마나 90도에 가까운지) - 핵심 지표
  const rightAngleScore = calculateRightAngles(corners)
  
  // 변의 길이 균형 (4개 변의 길이가 비슷한지)
  const lengthBalance = calculateLengthBalance(corners)
  
  // 정사각형 비율 검증 (가로:세로 1:1에 가까운지) - 중요 지표
  const squareRatio = calculateSquareRatio(corners)
  
  const completeness = calculateCompleteness(points)
  
  // 정사각형 정확도 계산 - 직각과 비율이 가장 중요
  const accuracy = (
    cornerScore * 0.15 + 
    straightness * 0.15 + 
    rightAngleScore * 0.45 +   // 직각 정확도가 핵심 (45%)
    lengthBalance * 0.15 + 
    squareRatio * 0.10         // 가로세로 비율 1:1 (10%)
  )
  
  // 소수점 3자리 정밀 점수 계산
  let rawScore = (accuracy * 0.85 + completeness * 0.15) * 100
  
  // 정사각형 정확도에 따른 매우 완화된 점수 조정
  if (rightAngleScore < 0.05 || cornerScore < 0.2) {
    rawScore = Math.min(rawScore, 20.000)    // 기본 형태도 안 됨
  } else if (rightAngleScore < 0.1 || squareRatio < 0.3) {
    rawScore = Math.min(rawScore, 40.000)    // 사각형이지만 정사각형과 거리 있음
  } else if (rightAngleScore < 0.25) {
    rawScore = Math.min(rawScore, 60.000)    // 어느 정도 사각형 형태
  } else if (rightAngleScore < 0.4) {
    rawScore = Math.min(rawScore, 75.000)    // 좋은 사각형
  } else if (rightAngleScore < 0.6) {
    rawScore = Math.min(rawScore, 88.000)    // 매우 좋은 사각형
  } else if (rightAngleScore < 0.8 || squareRatio < 0.7) {
    rawScore = Math.min(rawScore, 95.000)    // 거의 완벽한 사각형
  }
  // rightAngleScore >= 0.8 && squareRatio >= 0.7일 때만 95점 이상 가능
  
  const finalScore = rawScore
  
  let feedback = ""
  if (finalScore >= 99.000) {
    feedback = "Perfect square! All interior angles are very close to 90°! 🟦"
  } else if (finalScore >= 95.000) {
    feedback = "Excellent square! Right-angle accuracy and proportions are very high! 👏"
  } else if (finalScore >= 85.000) {
    feedback = "Good square! Try drawing the corners a bit more precisely."
  } else if (finalScore >= 70.000) {
    feedback = "Decent quadrilateral. Try making all four right angles more accurate."
  } else if (finalScore >= 50.000) {
    feedback = "Close to a square shape but needs improvement to be a true square."
  } else {
    feedback = "Try again! Draw a square with four right angles and equal side lengths."
  }
  
  return {
    score: Number(Math.min(100.000, Math.max(0.000, finalScore)).toFixed(3)),
    feedback,
    details: {
      accuracy: Math.round(accuracy * 100),
      smoothness: Math.round(straightness * 100),
      completeness: Math.round(completeness * 100)
    }
  }
}

// 코너 감지 함수
function findCorners(points: Point[]): Point[] {
  const corners: Point[] = []
  const threshold = Math.PI / 3 // 60도 이상의 각도 변화를 코너로 인식
  
  for (let i = 2; i < points.length - 2; i++) {
    const p1 = points[i - 2]
    const p2 = points[i]
    const p3 = points[i + 2]
    
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    
    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)
    
    let angleDiff = Math.abs(angle2 - angle1)
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
    
    if (angleDiff > threshold) {
      corners.push(points[i])
    }
  }
  
  return corners
}

// 직선성 계산
function calculateStraightness(points: Point[], corners: Point[]): number {
  if (corners.length < 2) return 0
  
  let totalDeviation = 0
  let segments = 0
  
  // 각 변의 직선성 측정
  for (let i = 0; i < corners.length; i++) {
    const start = corners[i]
    const end = corners[(i + 1) % corners.length]
    
    // 해당 변에 속하는 점들 찾기
    const segmentPoints = getPointsBetween(points, start, end)
    
    if (segmentPoints.length > 2) {
      const deviation = calculateLineDeviation(segmentPoints, start, end)
      if (!isNaN(deviation) && isFinite(deviation)) {
        totalDeviation += deviation
        segments++
      }
    }
  }
  
  if (segments === 0) return 0
  
  const avgDeviation = totalDeviation / segments
  if (isNaN(avgDeviation) || !isFinite(avgDeviation)) return 0
  
  // 편차를 정규화 (일반적으로 0~20 픽셀 범위)
  const normalizedDeviation = Math.min(avgDeviation / 20, 1)
  return Math.max(0, 1 - normalizedDeviation)
}

// 두 점 사이의 점들 추출
function getPointsBetween(points: Point[], start: Point, end: Point): Point[] {
  const startIdx = points.findIndex(p => distance(p, start) < 20)
  const endIdx = points.findIndex(p => distance(p, end) < 20)
  
  if (startIdx === -1 || endIdx === -1) return []
  
  if (startIdx < endIdx) {
    return points.slice(startIdx, endIdx + 1)
  } else {
    return points.slice(startIdx).concat(points.slice(0, endIdx + 1))
  }
}

// 직선으로부터의 편차 계산
function calculateLineDeviation(points: Point[], start: Point, end: Point): number {
  if (points.length === 0) return 0
  
  let totalDeviation = 0
  
  for (const point of points) {
    const deviation = pointToLineDistance(point, start, end)
    totalDeviation += deviation
  }
  
  return totalDeviation / points.length
}

// 점과 직선 사이의 거리
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = lineEnd.y - lineStart.y
  const B = lineStart.x - lineEnd.x
  const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y
  
  return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
}

// 직각 정밀 계산 (90도 정확도 측정)
function calculateRightAngles(corners: Point[]): number {
  if (corners.length !== 4) return 0
  
  let totalAngleScore = 0
  const targetAngle = Math.PI / 2 // 90도
  const angles: number[] = []
  
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[(i - 1 + corners.length) % corners.length]
    const p2 = corners[i]
    const p3 = corners[(i + 1) % corners.length]
    
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    
    const dot = v1.x * v2.x + v1.y * v2.y
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    
    if (mag1 > 1 && mag2 > 1) {
      const cosValue = Math.abs(dot) / (mag1 * mag2)
      const clampedCosValue = Math.min(1, Math.max(0, cosValue))
      const angle = Math.acos(clampedCosValue)
      angles.push(angle)
      
      const deviationFrom90 = Math.abs(angle - targetAngle)
      
      // 매우 완화된 직각 평가 - 지수적 감소  
      const angleAccuracy = Math.exp(-deviationFrom90 * 4) // 매우 완화된 평가
      totalAngleScore += angleAccuracy
    }
  }
  
  // 네 각의 합이 360도에 가까운지 추가 검증
  if (angles.length === 4) {
    const totalAngleDegrees = angles.reduce((sum, angle) => sum + angle, 0) * (180 / Math.PI)
    const anglesSumAccuracy = Math.max(0, 1 - Math.abs(totalAngleDegrees - 360) / 60)
    
    // 개별 각도 정확도(85%)와 총합 정확도(15%) 결합
    return (totalAngleScore / 4) * 0.85 + anglesSumAccuracy * 0.15
  }
  
  return totalAngleScore / Math.max(1, angles.length)
}

// 변 길이 균형 계산
function calculateLengthBalance(corners: Point[]): number {
  if (corners.length !== 4) return 0
  
  const sideLengths = []
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i]
    const p2 = corners[(i + 1) % corners.length]
    sideLengths.push(distance(p1, p2))
  }
  
  const avgLength = sideLengths.reduce((sum, len) => sum + len, 0) / sideLengths.length
  const variance = sideLengths.reduce((sum, len) => sum + (len - avgLength) ** 2, 0) / sideLengths.length
  const standardDeviation = Math.sqrt(variance)
  
  const coefficientOfVariation = standardDeviation / avgLength
  return Math.max(0, 1 - coefficientOfVariation)
}

// 정사각형 비율 계산 (가로:세로가 1:1에 가까운지)
function calculateSquareRatio(corners: Point[]): number {
  if (corners.length !== 4) return 0
  
  // 대각선 길이들 계산
  const diagonal1 = distance(corners[0], corners[2])
  const diagonal2 = distance(corners[1], corners[3])
  
  // 두 대각선의 길이가 비슷해야 함
  const diagonalRatio = Math.min(diagonal1, diagonal2) / Math.max(diagonal1, diagonal2)
  
  // 사각형의 너비와 높이 근사 계산
  const side1 = distance(corners[0], corners[1])
  const side2 = distance(corners[1], corners[2])
  const side3 = distance(corners[2], corners[3])
  const side4 = distance(corners[3], corners[0])
  
  // 대변끼리 짝을 맞춰 너비와 높이 계산
  const width = (side1 + side3) / 2
  const height = (side2 + side4) / 2
  
  const aspectRatio = Math.min(width, height) / Math.max(width, height)
  
  // 대각선 비율 + 가로세로 비율
  return (diagonalRatio * 0.4 + aspectRatio * 0.6)
}

// 정삼각형 정밀 채점 알고리즘
export function scoreTriangle(points: Point[]): ScoringResult {
  if (points.length < 10) {
    return {
      score: 0.000,
      feedback: "The line is too short. Try drawing a bigger triangle.",
      details: {
        accuracy: 0,
        smoothness: 0,
        completeness: 0
      }
    }
  }

  // 삼각형의 꼭짓점 감지
  const corners = findTriangleCorners(points)
  const cornerScore = corners.length === 3 ? 1 : Math.max(0, 1 - Math.abs(corners.length - 3) / 3)
  
  // 직선성 측정 (3개 변이 얼마나 직선에 가까운지)
  const straightness = calculateTriangleStraightness(points, corners)
  
  // 삼각형의 변 길이 비율 (1:1:1에 가까운지)
  const proportionScore = calculateTriangleProportions(corners)
  
  // 정삼각형 내각 검증 (세 각이 모두 60도에 가까운지) - 핵심 지표
  const equilateralScore = calculateEquilateralAngles(corners)
  
  // 정삼각형 대칭성 검증 추가
  const symmetryScore = calculateTriangleSymmetry(corners)
  
  const completeness = calculateCompleteness(points)
  
  // 정삼각형 정확도 계산 - 내각 60도가 가장 중요
  const accuracy = (
    cornerScore * 0.15 + 
    straightness * 0.15 + 
    proportionScore * 0.25 + 
    equilateralScore * 0.40 +  // 내각 60도 정확도가 핵심 (40%)
    symmetryScore * 0.05
  )
  
  // 소수점 3자리 정밀 점수 계산
  let rawScore = (accuracy * 0.85 + completeness * 0.15) * 100
  
  // 정삼각형 정확도에 따른 매우 완화된 점수 조정
  if (equilateralScore < 0.05 || cornerScore < 0.2) {
    rawScore = Math.min(rawScore, 18.000)    // 기본 형태도 안 됨
  } else if (equilateralScore < 0.1) {
    rawScore = Math.min(rawScore, 35.000)    // 삼각형이지만 정삼각형과 거리 있음
  } else if (equilateralScore < 0.25) {
    rawScore = Math.min(rawScore, 55.000)    // 어느 정도 정삼각형 형태
  } else if (equilateralScore < 0.4) {
    rawScore = Math.min(rawScore, 75.000)    // 좋은 정삼각형
  } else if (equilateralScore < 0.6) {
    rawScore = Math.min(rawScore, 88.000)    // 매우 좋은 정삼각형
  } else if (equilateralScore < 0.8) {
    rawScore = Math.min(rawScore, 95.000)    // 거의 완벽한 정삼각형
  }
  // equilateralScore >= 0.8일 때만 95점 이상 가능
  
  const finalScore = rawScore
  
  let feedback = ""
  if (finalScore >= 99.000) {
    feedback = "Perfect equilateral triangle! All interior angles are very close to 60°! 🔺"
  } else if (finalScore >= 95.000) {
    feedback = "Excellent equilateral triangle! Angle accuracy is very high! 👏"
  } else if (finalScore >= 85.000) {
    feedback = "Good equilateral triangle! Try drawing the vertices a bit more precisely."
  } else if (finalScore >= 70.000) {
    feedback = "Decent equilateral triangle. Try making all three angles closer to 60°."
  } else if (finalScore >= 50.000) {
    feedback = "Close to a triangle shape but needs improvement to be an equilateral triangle."
  } else {
    feedback = "Try again! Draw an equilateral triangle with three equal sides."
  }
  
  return {
    score: Number(Math.min(100.000, Math.max(0.000, finalScore)).toFixed(3)),
    feedback,
    details: {
      accuracy: Math.round(accuracy * 100),
      smoothness: Math.round(straightness * 100),
      completeness: Math.round(completeness * 100)
    }
  }
}

// 삼각형 코너 감지
function findTriangleCorners(points: Point[]): Point[] {
  const corners: Point[] = []
  const threshold = Math.PI / 6 // 30도 이상의 각도 변화를 코너로 인식 (더 민감하게)
  
  for (let i = 3; i < points.length - 3; i++) {
    const p1 = points[i - 3]
    const p2 = points[i]
    const p3 = points[i + 3]
    
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    
    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)
    
    let angleDiff = Math.abs(angle2 - angle1)
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
    
    if (angleDiff > threshold) {
      // 중복 코너 제거 (가까운 거리의 코너들 병합)
      const isDuplicate = corners.some(corner => distance(corner, points[i]) < 30)
      if (!isDuplicate) {
        corners.push(points[i])
      }
    }
  }
  
  // 가장 뚜렷한 3개의 코너만 선택
  if (corners.length > 3) {
    corners.sort((a, b) => {
      const scoreA = getCornerSharpness(points, a)
      const scoreB = getCornerSharpness(points, b)
      return scoreB - scoreA
    })
    return corners.slice(0, 3)
  }
  
  return corners
}

// 코너의 날카로움 정도 계산
function getCornerSharpness(points: Point[], corner: Point): number {
  const cornerIdx = points.findIndex(p => distance(p, corner) < 5)
  if (cornerIdx === -1 || cornerIdx < 3 || cornerIdx >= points.length - 3) return 0
  
  const p1 = points[cornerIdx - 3]
  const p2 = points[cornerIdx]
  const p3 = points[cornerIdx + 3]
  
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
  
  const angle1 = Math.atan2(v1.y, v1.x)
  const angle2 = Math.atan2(v2.y, v2.x)
  
  let angleDiff = Math.abs(angle2 - angle1)
  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
  
  return angleDiff
}

// 삼각형 직선성 계산
function calculateTriangleStraightness(points: Point[], corners: Point[]): number {
  if (corners.length !== 3) return 0
  
  let totalDeviation = 0
  let segments = 0
  
  // 각 변의 직선성 측정
  for (let i = 0; i < 3; i++) {
    const start = corners[i]
    const end = corners[(i + 1) % 3]
    
    // 해당 변에 속하는 점들 찾기
    const segmentPoints = getTriangleSegmentPoints(points, start, end)
    
    if (segmentPoints.length > 2) {
      const deviation = calculateLineDeviation(segmentPoints, start, end)
      if (!isNaN(deviation) && isFinite(deviation)) {
        totalDeviation += deviation
        segments++
      }
    }
  }
  
  if (segments === 0) {
    // 만약 변에 속하는 점을 찾지 못했다면, 전체 점들의 부드러움을 측정
    return calculateSmoothness(points)
  }
  
  const avgDeviation = totalDeviation / segments
  if (isNaN(avgDeviation) || !isFinite(avgDeviation)) return 0
  
  // 편차를 정규화 (일반적으로 0~10 픽셀 범위)
  const normalizedDeviation = Math.min(avgDeviation / 10, 1)
  return Math.max(0, 1 - normalizedDeviation)
}

// 삼각형 변에 속하는 점들 추출
function getTriangleSegmentPoints(points: Point[], start: Point, end: Point): Point[] {
  const segmentPoints: Point[] = []
  const maxDistance = 25 // 변으로부터 최대 허용 거리 (더 관대하게)
  const segmentLength = distance(start, end)
  
  if (segmentLength === 0) return segmentPoints
  
  for (const point of points) {
    const distToLine = pointToLineDistance(point, start, end)
    const distToStart = distance(point, start)
    const distToEnd = distance(point, end)
    
    // 점이 선분 근처에 있는지 확인하는 더 관대한 조건
    const isNearLine = distToLine < maxDistance
    const isWithinSegment = (distToStart + distToEnd) <= (segmentLength * 1.3) // 30% 여유 추가
    
    if (isNearLine && isWithinSegment) {
      segmentPoints.push(point)
    }
  }
  
  return segmentPoints
}

// 삼각형 비율 계산 (너무 찌그러지지 않았는지)
function calculateTriangleProportions(corners: Point[]): number {
  if (corners.length !== 3) return 0
  
  // 세 변의 길이 계산
  const side1 = distance(corners[0], corners[1])
  const side2 = distance(corners[1], corners[2])
  const side3 = distance(corners[2], corners[0])
  
  const sides = [side1, side2, side3].sort((a, b) => a - b)
  const shortest = sides[0]
  const longest = sides[2]
  
  // 가장 긴 변과 가장 짧은 변의 비율이 너무 크지 않아야 함
  const ratio = longest / shortest
  const idealMaxRatio = 3 // 1:3 비율까지는 허용
  
  const ratioScore = Math.max(0, 1 - (ratio - 1) / (idealMaxRatio - 1))
  
  // 삼각형 넓이 체크 (너무 얇지 않아야 함)
  const area = Math.abs((corners[0].x * (corners[1].y - corners[2].y) + 
                        corners[1].x * (corners[2].y - corners[0].y) + 
                        corners[2].x * (corners[0].y - corners[1].y)) / 2)
  
  const perimeter = side1 + side2 + side3
  const areaToPerimeterRatio = area / (perimeter * perimeter)
  const areaScore = Math.min(1, areaToPerimeterRatio * 100) // 정규화
  
  return (ratioScore * 0.7 + areaScore * 0.3)
}

// 정삼각형 내각 정밀 검증 (세 각이 모두 60도에 가까운지)
function calculateEquilateralAngles(corners: Point[]): number {
  if (corners.length !== 3) return 0
  
  let totalAngleScore = 0
  const targetAngle = Math.PI / 3 // 60도
  const angles: number[] = []
  
  for (let i = 0; i < 3; i++) {
    const p1 = corners[(i - 1 + 3) % 3]
    const p2 = corners[i]
    const p3 = corners[(i + 1) % 3]
    
    // 벡터 계산
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    
    const dot = v1.x * v2.x + v1.y * v2.y
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    
    if (mag1 > 1 && mag2 > 1) {
      const cosValue = dot / (mag1 * mag2)
      const clampedCosValue = Math.min(1, Math.max(-1, cosValue))
      const angle = Math.acos(Math.abs(clampedCosValue))
      angles.push(angle)
      
      const deviationFrom60 = Math.abs(angle - targetAngle)
      
      // 매우 완화된 각도 평가 - 지수적 감소
      const angleAccuracy = Math.exp(-deviationFrom60 * 5) // 매우 완화된 평가
      totalAngleScore += angleAccuracy
    }
  }
  
  // 세 각의 합이 180도에 가까운지 추가 검증
  if (angles.length === 3) {
    const totalAngleDegrees = angles.reduce((sum, angle) => sum + angle, 0) * (180 / Math.PI)
    const anglesSumAccuracy = Math.max(0, 1 - Math.abs(totalAngleDegrees - 180) / 30)
    
    // 개별 각도 정확도(80%)와 총합 정확도(20%) 결합
    return (totalAngleScore / 3) * 0.8 + anglesSumAccuracy * 0.2
  }
  
  return totalAngleScore / 3
}

// 정삼각형 대칭성 검증
function calculateTriangleSymmetry(corners: Point[]): number {
  if (corners.length !== 3) return 0
  
  // 세 변의 길이 계산
  const side1 = distance(corners[0], corners[1])
  const side2 = distance(corners[1], corners[2])
  const side3 = distance(corners[2], corners[0])
  
  const sides = [side1, side2, side3]
  const avgSideLength = sides.reduce((sum, len) => sum + len, 0) / 3
  
  // 변 길이 균등성 (정삼각형의 핵심 특성)
  let sideDeviationSum = 0
  for (const side of sides) {
    sideDeviationSum += Math.abs(side - avgSideLength) / avgSideLength
  }
  
  const sideLengthConsistency = Math.max(0, 1 - sideDeviationSum * 2)
  
  // 중심점으로부터 각 꼭짓점까지의 거리 (외접원 반지름)
  const center = getCenterPoint(corners)
  const radii = corners.map(corner => distance(corner, center))
  const avgRadius = radii.reduce((sum, r) => sum + r, 0) / 3
  
  let radiusDeviationSum = 0
  for (const radius of radii) {
    radiusDeviationSum += Math.abs(radius - avgRadius) / avgRadius
  }
  
  const radiusConsistency = Math.max(0, 1 - radiusDeviationSum * 2)
  
  return sideLengthConsistency * 0.7 + radiusConsistency * 0.3
}