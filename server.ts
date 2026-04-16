import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("FIREBASE_SERVICE_ACCOUNT detected, attempting to parse...");
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    console.log("FIREBASE_SERVICE_ACCOUNT raw length:", raw.length);
    if (raw.length > 0) {
      console.log("FIREBASE_SERVICE_ACCOUNT first char:", raw[0], "code:", raw.charCodeAt(0));
    }
    
    // If it's a JSON object, it should start with {
    if (raw.startsWith('{')) {
      const serviceAccount = JSON.parse(raw);
      console.log("FIREBASE_SERVICE_ACCOUNT parsed successfully.");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.error("FIREBASE_SERVICE_ACCOUNT does not appear to be a JSON object (should start with {). Value starts with:", raw.substring(0, 20));
    }
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Ensure it is a valid JSON string.", error);
  }
} else {
  console.log("FIREBASE_SERVICE_ACCOUNT not found in environment.");
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook (must be before express.json())
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        
        // Find user by stripeCustomerId and update status
        const usersRef = admin.firestore().collection("users");
        const snapshot = await usersRef.where("stripeCustomerId", "==", customerId).get();
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: status,
            plan: status === "active" ? "pro" : "free"
          });
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Routes
  app.post("/api/create-checkout-session", async (req, res) => {
    const { userId, email } = req.body;

    try {
      // Get or create customer
      const usersRef = admin.firestore().collection("users");
      const userDoc = await usersRef.doc(userId).get();
      let customerId = userDoc.data()?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({ email });
        customerId = customer.id;
        await usersRef.doc(userId).update({ stripeCustomerId: customerId });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_PRO_PLAN_ID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/settings`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
