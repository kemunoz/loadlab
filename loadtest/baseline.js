// Steady arrival rate. Tune RATE to your expected normal load.
import { setupTokens, mixed, thresholds } from "./lib.js";

const RATE = Number(__ENV.RATE || 50);

export const options = {
  scenarios: {
    baseline: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: "1s",
      duration: __ENV.DURATION || "5m",
      preAllocatedVUs: 50,
      maxVUs: 500,
    },
  },
  thresholds,
};
export const setup = setupTokens;
export default mixed;
