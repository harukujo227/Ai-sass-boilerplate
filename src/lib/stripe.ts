import Stripe from "stripe";
import config from "./config";

const apiKey = config.stripe.secretKey && config.stripe.secretKey.trim() !== ""
  ? config.stripe.secretKey
  : "sk_test_placeholder_key_for_build_purposes";

export const stripe = new Stripe(apiKey, {
  // Pinned API version carried over from the original JS. Cast because the
  // SDK's types only accept its bundled LatestApiVersion literal, while any
  // valid historical version string is accepted at runtime.
  apiVersion: "2023-10-16" as unknown as typeof Stripe.API_VERSION,
});

export default stripe;
