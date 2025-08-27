import { Point } from '@/components/DrawingCanvas'

// 도형별 채점 결과 인터페이스
export interface ScoringResult {
  score: number // 0-100점
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

// 원주율 기반 원형도 계산
function calculateCircularity(points: Point[]): number {
  if (points.length < 15) return 0
  
  const center = getCenterPoint(points)
  const radii = points.map(point => distance(point, center))
  const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length
  
  // 반지름 변동성 계산
  const radiusVariance = radii.reduce((sum, r) => sum + (r - avgRadius) ** 2, 0) / radii.length
  const radiusConsistency = Math.max(0, 1 - Math.sqrt(radiusVariance) / avgRadius)
  
  // 둘레 계산 (연속된 점들 사이의 거리의 합)
  let perimeter = 0
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += distance(points[i], points[i + 1])
  }
  // 마지막 점과 첫 번째 점 사이의 거리도 추가
  if (points.length > 2) {
    perimeter += distance(points[points.length - 1], points[0])
  }
  
  // 이론적 원의 둘레 (2πr)
  const theoreticalCircumference = 2 * Math.PI * avgRadius
  
  // 실제 둘레와 이론적 둘레의 차이
  const circumferenceRatio = Math.min(perimeter, theoreticalCircumference) / Math.max(perimeter, theoreticalCircumference)
  
  // 원주율 정확도 (실제 둘레 / 지름이 π에 얼마나 가까운지)
  const diameter = avgRadius * 2
  const actualPi = perimeter / diameter
  const piAccuracy = Math.max(0, 1 - Math.abs(actualPi - Math.PI) / Math.PI)
  
  // 최종 원형도 = 반지름 일관성 + 둘레 비율 + 원주율 정확도 (원주율 정확도 중심)
  return (radiusConsistency * 0.5 + circumferenceRatio * 0.2 + piAccuracy * 0.3)
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
      feedback: "너무 짧은 선입니다. 더 긴 원을 그려보세요.",
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
  
  // 원주율 기반 엄격한 채점 - 정확도 중심으로 강화
  const accuracy = circularity
  const score = Math.round(
    accuracy * 0.90 +        // 정확도(원형도) 90%
    smoothness * 0.07 +      // 부드러움 7% 
    completeness * 0.03      // 완전성 3%
  ) * 100
  
  // 매우 엄격한 임계값 적용 - 원주율이 정확하지 않으면 큰 감점
  let finalScore = score
  if (accuracy < 0.7) {
    finalScore = Math.min(score, 30)  // 매우 낮은 점수
  } else if (accuracy < 0.85) {
    finalScore = Math.min(score, 60)  // 보통 점수 제한
  } else if (accuracy < 0.95) {
    finalScore = Math.min(score, 85)  // 고득점 제한
  }
  
  let feedback = ""
  if (finalScore >= 95) {
    feedback = "완벽한 원이에요! 🎉"
  } else if (finalScore >= 85) {
    feedback = "훌륭한 원입니다! 👏"
  } else if (finalScore >= 75) {
    feedback = "좋은 원이에요! 조금 더 정확히 그려보세요."
  } else if (finalScore >= 65) {
    feedback = "괜찮은 원입니다. 더 둥글게 그려보세요."
  } else if (finalScore >= 45) {
    feedback = "원 모양에 가깝지만 개선이 필요해요."
  } else {
    feedback = "다시 도전해보세요! 더 둥근 원을 그려보세요."
  }
  
  return {
    score: Math.min(100, Math.max(0, finalScore)),
    feedback,
    details: {
      accuracy: Math.round(accuracy * 100),
      smoothness: Math.round(smoothness * 100),
      completeness: Math.round(completeness * 100)
    }
  }
}

// 별(5각별) 채점 알고리즘
export function scoreStar(points: Point[]): ScoringResult {
  if (points.length < 15) {
    return {
      score: 0,
      feedback: "너무 짧은 선입니다. 더 큰 별을 그려보세요.",
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
  
  // 별의 뾰족한 부분과 들어간 부분의 비율 (이상적으로는 약 0.4-0.6)
  const radiusRatio = minRadius / maxRadius
  const idealRatio = 0.5
  const ratioScore = Math.max(0, 1 - Math.abs(radiusRatio - idealRatio) * 2)
  
  // 각도별 거리 변화 패턴 분석 (별은 5개의 피크를 가져야 함)
  let peaks = 0
  
  for (let i = 1; i < radii.length - 1; i++) {
    if (radii[i] > radii[i-1] && radii[i] > radii[i+1]) peaks++
  }
  
  // 이상적으로는 5개의 주요 피크를 가져야 함
  const peakScore = Math.max(0, 1 - Math.abs(peaks - 5) / 5)
  
  const completeness = calculateCompleteness(points)
  
  const accuracy = (ratioScore * 0.6 + peakScore * 0.4)
  const score = Math.round((accuracy * 0.80 + smoothness * 0.10 + completeness * 0.10) * 100)
  
  // 별은 더 까다롭게 채점 - 피크가 정확하지 않으면 점수 감점
  const finalScore = peakScore < 0.4 ? Math.min(score, 25) : score
  
  let feedback = ""
  if (finalScore >= 95) {
    feedback = "완벽한 별이에요! ⭐️"
  } else if (finalScore >= 85) {
    feedback = "훌륭한 별입니다! 👏"
  } else if (finalScore >= 75) {
    feedback = "좋은 별이에요! 뾰족한 부분을 더 날카롭게 그려보세요."
  } else if (finalScore >= 65) {
    feedback = "괜찮은 별입니다. 5개의 꼭짓점을 더 분명하게 표현해보세요."
  } else if (finalScore >= 45) {
    feedback = "별 모양에 가깝지만 개선이 필요해요."
  } else {
    feedback = "다시 도전해보세요! 5개의 뾰족한 꼭짓점을 가진 별을 그려보세요."
  }
  
  return {
    score: Math.min(100, Math.max(0, finalScore)),
    feedback,
    details: {
      accuracy: Math.round(accuracy * 100),
      smoothness: Math.round(smoothness * 100),
      completeness: Math.round(completeness * 100)
    }
  }
}

// 사각형 채점 알고리즘
export function scoreSquare(points: Point[]): ScoringResult {
  if (points.length < 12) {
    return {
      score: 0,
      feedback: "너무 짧은 선입니다. 더 큰 사각형을 그려보세요.",
      details: {
        accuracy: 0,
        smoothness: 0,
        completeness: 0
      }
    }
  }

  // 코너 감지 (각도 변화가 큰 지점들)
  const corners = findCorners(points)
  const cornerScore = Math.max(0, 1 - Math.abs(corners.length - 4) / 4)
  
  // 직선성 측정 (각 변이 얼마나 직선에 가까운지)
  const straightness = calculateStraightness(points, corners)
  
  // 직각 측정 (코너들이 얼마나 90도에 가까운지)
  const rightAngleScore = calculateRightAngles(corners)
  
  // 변의 길이 균형 (4개 변의 길이가 비슷한지)
  const lengthBalance = calculateLengthBalance(corners)
  
  // 정사각형 비율 검증 (가로:세로 1:1에 가까운지)
  const squareRatio = calculateSquareRatio(corners)
  
  const completeness = calculateCompleteness(points)
  
  const accuracy = (cornerScore * 0.25 + straightness * 0.25 + rightAngleScore * 0.35 + lengthBalance * 0.10 + squareRatio * 0.05)
  const score = Math.round((accuracy * 0.90 + completeness * 0.10) * 100)
  
  // 사각형 매우 까다롭게 채점 - 코너가 4개가 아니거나 직각이 부정확하면 큰 감점
  const finalScore = (cornerScore < 0.7 || rightAngleScore < 0.5) ? Math.min(score, 25) : score
  
  let feedback = ""
  if (finalScore >= 95) {
    feedback = "완벽한 사각형이에요! 🟦"
  } else if (finalScore >= 85) {
    feedback = "훌륭한 사각형입니다! 👏"
  } else if (finalScore >= 75) {
    feedback = "좋은 사각형이에요! 모서리를 더 정확히 그려보세요."
  } else if (finalScore >= 65) {
    feedback = "괜찮은 사각형입니다. 4개의 직각을 더 정확히 만들어보세요."
  } else if (finalScore >= 45) {
    feedback = "사각형 모양에 가깝지만 개선이 필요해요."
  } else {
    feedback = "다시 도전해보세요! 4개의 직각을 가진 사각형을 그려보세요."
  }
  
  return {
    score: Math.min(100, Math.max(0, finalScore)),
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

// 직각 계산 (NaN 문제 해결)
function calculateRightAngles(corners: Point[]): number {
  if (corners.length !== 4) return 0
  
  let rightAngleScore = 0
  let validAngles = 0
  
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[(i - 1 + corners.length) % corners.length]
    const p2 = corners[i]
    const p3 = corners[(i + 1) % corners.length]
    
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }
    
    const dot = v1.x * v2.x + v1.y * v2.y
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    
    if (mag1 > 1 && mag2 > 1) { // 최소 거리 확보로 NaN 방지
      const cosValue = Math.abs(dot) / (mag1 * mag2)
      // cosValue가 1을 초과하지 않도록 클램핑
      const clampedCosValue = Math.min(1, Math.max(0, cosValue))
      const angle = Math.acos(clampedCosValue)
      const deviationFrom90 = Math.abs(angle - Math.PI / 2)
      
      // 85도~95도 범위를 엄격하게 적용 (±5도)
      const allowedDeviation = Math.PI / 36 // 5도
      if (deviationFrom90 <= allowedDeviation) {
        rightAngleScore += Math.max(0, 1 - deviationFrom90 / allowedDeviation)
      }
      validAngles++
    }
  }
  
  return validAngles > 0 ? rightAngleScore / validAngles : 0
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

// 삼각형 채점 알고리즘
export function scoreTriangle(points: Point[]): ScoringResult {
  if (points.length < 10) {
    return {
      score: 0,
      feedback: "너무 짧은 선입니다. 더 큰 삼각형을 그려보세요.",
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
  
  // 삼각형의 변 길이 비율 (너무 찌그러지지 않았는지)
  const proportionScore = calculateTriangleProportions(corners)
  
  // 정삼각형 내각 검증 (세 각이 모두 60도에 가까운지)
  const equilateralScore = calculateEquilateralAngles(corners)
  
  const completeness = calculateCompleteness(points)
  
  const accuracy = (cornerScore * 0.30 + straightness * 0.25 + proportionScore * 0.20 + equilateralScore * 0.25)
  const score = Math.round((accuracy * 0.90 + completeness * 0.10) * 100)
  
  // 삼각형 매우 까다롭게 채점 - 코너가 3개가 아니거나 내각이 60도에서 멀면 큰 감점
  const finalScore = (cornerScore < 0.8 || equilateralScore < 0.3) ? Math.min(score, 30) : score
  
  let feedback = ""
  if (finalScore >= 95) {
    feedback = "완벽한 삼각형이에요! 🔺"
  } else if (finalScore >= 85) {
    feedback = "훌륭한 삼각형입니다! 👏"
  } else if (finalScore >= 75) {
    feedback = "좋은 삼각형이에요! 꼭짓점을 더 정확히 그려보세요."
  } else if (finalScore >= 65) {
    feedback = "괜찮은 삼각형입니다. 3개의 직선을 더 정확히 연결해보세요."
  } else if (finalScore >= 45) {
    feedback = "삼각형 모양에 가깝지만 개선이 필요해요."
  } else {
    feedback = "다시 도전해보세요! 3개의 직선으로 이루어진 삼각형을 그려보세요."
  }
  
  return {
    score: Math.min(100, Math.max(0, finalScore)),
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

// 정삼각형 내각 검증 (세 각이 모두 60도에 가까운지)
function calculateEquilateralAngles(corners: Point[]): number {
  if (corners.length !== 3) return 0
  
  let angleScore = 0
  const targetAngle = Math.PI / 3 // 60도
  const allowedDeviation = Math.PI / 36 // ±5도
  
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
      
      const deviationFrom60 = Math.abs(angle - targetAngle)
      
      // 55도~65도 범위를 엄격하게 적용
      if (deviationFrom60 <= allowedDeviation) {
        angleScore += Math.max(0, 1 - deviationFrom60 / allowedDeviation)
      }
    }
  }
  
  return angleScore / 3 // 평균 점수 반환
}