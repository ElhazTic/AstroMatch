import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not defined. Please add it to your .env.local file."
      );
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
  }

  return stripeClient;
}

export interface CheckoutSessionParams {
  email: string;
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
  score: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  advice: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<string> {
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID is not defined. Please add it to your .env.local file."
    );
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      email: params.email,
      personA: params.personA,
      dateA: params.dateA,
      personB: params.personB,
      dateB: params.dateB,
      score: params.score.toString(),
      summary: params.summary.substring(0, 500), // Stripe metadata limit
      strengths: params.strengths.substring(0, 500),
      weaknesses: params.weaknesses.substring(0, 500),
      advice: params.advice.substring(0, 500),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not defined. Please add it to your .env.local file."
    );
  }

  const stripe = getStripeClient();

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
