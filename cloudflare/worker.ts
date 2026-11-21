import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  API_CONTAINER: DurableObjectNamespace;
  JWT_SECRET: string;
  DATABASE_URL?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  PAYFAST_MERCHANT_ID?: string;
  PAYFAST_MERCHANT_KEY?: string;
  PAYFAST_PASSPHRASE?: string;
  OZOW_SITE_CODE?: string;
  OZOW_PRIVATE_KEY?: string;
  OZOW_API_KEY?: string;
  PAYFLEX_CLIENT_ID?: string;
  PAYFLEX_CLIENT_SECRET?: string;
  CRYPTO_API_KEY?: string;
  CRYPTO_WEBHOOK_SECRET?: string;
  GEMINI_API_KEY?: string;
}

export class MevoApiContainer extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = "5m";
  enableInternet = true;
  pingEndpoint = "localhost/health";
}

function buildContainerEnvironment(env: Env): Record<string, string> {
  const values: Record<string, string | undefined> = {
    NODE_ENV: "production",
    PORT: "3000",
    JWT_SECRET: env.JWT_SECRET,
    DATABASE_URL: env.DATABASE_URL,
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    FIREBASE_SERVICE_ACCOUNT_JSON: env.FIREBASE_SERVICE_ACCOUNT_JSON,
    PAYSTACK_SECRET_KEY: env.PAYSTACK_SECRET_KEY,
    PAYSTACK_WEBHOOK_SECRET: env.PAYSTACK_WEBHOOK_SECRET,
    PAYFAST_MERCHANT_ID: env.PAYFAST_MERCHANT_ID,
    PAYFAST_MERCHANT_KEY: env.PAYFAST_MERCHANT_KEY,
    PAYFAST_PASSPHRASE: env.PAYFAST_PASSPHRASE,
    OZOW_SITE_CODE: env.OZOW_SITE_CODE,
    OZOW_PRIVATE_KEY: env.OZOW_PRIVATE_KEY,
    OZOW_API_KEY: env.OZOW_API_KEY,
    PAYFLEX_CLIENT_ID: env.PAYFLEX_CLIENT_ID,
    PAYFLEX_CLIENT_SECRET: env.PAYFLEX_CLIENT_SECRET,
    CRYPTO_API_KEY: env.CRYPTO_API_KEY,
    CRYPTO_WEBHOOK_SECRET: env.CRYPTO_WEBHOOK_SECRET,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
  };

  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.JWT_SECRET) {
      return Response.json({ error: "Staging runtime is not configured." }, { status: 503 });
    }

    const container = getContainer(env.API_CONTAINER, "mevo-tech-staging-api");
    await container.startAndWaitForPorts({
      ports: [3000],
      startOptions: {
        envVars: buildContainerEnvironment(env),
        enableInternet: true,
      },
      cancellationOptions: {
        portReadyTimeoutMS: 60_000,
      },
    });

    return container.fetch(request);
  },
};
