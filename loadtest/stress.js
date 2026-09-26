// Ramp request rate up until thresholds break; the knee is your capacity.
import { setupTokens, mixed } from "./lib.js";

const MAX = Number(__ENV.MAX_RATE || 500);
const STEP = Math.max(1, Math.floor(MAX / 10));
const stages = [];
for (let r = STEP; r <= MAX; r += STEP) {
  stages.push({ target: r, duration: "1m" }); // ramp to r
  stages.push({ target: r, duration: "1m" }); // hold at r
}

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-arrival-rate",
      startRate: STEP,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 2000,
      stages,
    },
  },
  // Don't abort: we want to see behaviour past the knee.
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};
export const setup = setupTokens;
export default mixed;
