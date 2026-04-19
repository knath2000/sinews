import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as any;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });
}

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { dbUser } = auth;

  const profile = await db.user_profiles.findUnique({
    where: { user_id: dbUser.id },
    select: { stripe_customer_id: true },
  });

  const appUrl = process.env.APP_BASE_URL;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    mode: "subscription",
    client_reference_id: dbUser.id,
    line_items: [
      {
        price: process.env.STRIPE_PREMIUM_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/settings?upgrade=success`,
    cancel_url: `${appUrl}/settings`,
  };

  if (profile?.stripe_customer_id) {
    sessionParams.customer = profile.stripe_customer_id;
  } else {
    sessionParams.customer_email = dbUser.email;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}
