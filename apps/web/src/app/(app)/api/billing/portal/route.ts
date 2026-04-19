import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as any,
  });
}

export async function POST() {
  try {
    const auth = await requireAuth();
    if (auth instanceof Response) return auth;

    const { dbUser } = auth;

    const profile = await db.user_profiles.findUnique({
      where: { user_id: dbUser.id },
      select: { stripe_customer_id: true },
    });

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Please upgrade first." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.APP_BASE_URL}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE_PORTAL_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate billing portal link" },
      { status: 500 }
    );
  }
}
