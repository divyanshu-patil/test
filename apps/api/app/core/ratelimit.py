import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class RateLimiter:
    # ponytail: per-process memory; move to Redis when the API runs more than one worker.
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_s: float) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - window_s:
                q.popleft()
            if len(q) >= limit:
                retry = int(q[0] + window_s - now) + 1
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests. Try again shortly.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()
