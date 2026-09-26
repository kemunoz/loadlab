// Long moderate load: exposes leaks, pool exhaustion, table/index bloat.
import { setupTokens, mixed, thresholds } from "./lib.js";

export const options = {
  scenarios: {
    soak: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 40),
      timeUnit: "1s",
      duration: __ENV.DURATION || "1h",
      preAllocatedVUs: 50,
      maxVUs: 500,
    },
  },
  thresholds,
};
export const setup = setupTokens;
export default mixed;
