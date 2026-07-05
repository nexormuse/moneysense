// 인메모리 IP 기반 rate limiter (공개 API 남용 방지)
// 주의: 서버리스 환경에서는 인스턴스별 메모리라 완벽한 차단은 아니다.
// 인스턴스가 여러 개 뜨면 인스턴스 수만큼 상한이 늘어날 수 있지만,
// 해커톤 데모 규모에서는 충분한 1차 방어선이다. 실서비스에서는 Redis 등 공유 저장소로 교체.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1분 윈도우
const MAX_BUCKETS = 5000; // 메모리 무한 증가 방지

/** key(라우트+IP)별 분당 호출 횟수를 검사한다. 허용되면 true. */
export function checkRateLimit(key: string, limitPerMinute: number): boolean {
  const now = Date.now();

  // 버킷이 너무 쌓이면 만료된 것부터 정리
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= limitPerMinute) return false;
  bucket.count += 1;
  return true;
}

/** 프록시 뒤(Vercel)에서 클라이언트 IP를 추출한다 */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
