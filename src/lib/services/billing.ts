import type Stripe from "stripe";
import { stripe } from "../stripe";
import config from "../config";
import { UserService } from "./user";

export const BillingService = {
  async createCheckoutSession(userId: string, planId: string): Promise<string | null> {
    const plan = config.stripe.plans[planId as keyof typeof config.stripe.plans];
    if (!plan) throw new Error("Invalid plan selected");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.name}`,
              description: `Purchase ${plan.credits} credits to perform AI generations.`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${config.auth.url}/pricing?success=true`,
      cancel_url: `${config.auth.url}/pricing?canceled=true`,
      metadata: { userId, credits: plan.credits.toString() },
    });

    return session.url;
  },

  async handleWebhook(body: string | Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret!);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || "0", 10);

      if (userId && credits > 0) {
        await UserService.addCredits(userId, credits);
        return { success: true, userId, credits };
      }
    }
    return { success: false };
  },
};

export const createCheckoutSession = BillingService.createCheckoutSession.bind(BillingService);
export const handleWebhook = BillingService.handleWebhook.bind(BillingService);
export default BillingService;
