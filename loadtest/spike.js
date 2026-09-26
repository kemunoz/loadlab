import { setupTokens, mixed } from "./lib.js";

const BASE = Number(__ENV.RATE || 30);
const PEAK = Number(__ENV.PEAK_RATE || 400);

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-arrival-rate",
      startRate: BASE,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 2000,
      stages: [
        { target: BASE, duration: "1m" },
        { target: PEAK, duration: "10s" },
        { target: PEAK, duration: "2m" },
        { target: BASE, duration: "10s" },
        { target: BASE, duration: "3m" }, // recovery: does latency return to normal?
      ],
    },
  },
};
export const setup = setupTokens;
export default mixed;
