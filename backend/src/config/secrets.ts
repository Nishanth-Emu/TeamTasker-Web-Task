import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

// Define an interface for type safety
export interface AppSecrets {
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: number;
  PORT: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_CACHE_TTL: number;
  REDIS_TLS_ENABLED: boolean;
}


const secretName = process.env.AWS_SECRET_NAME || "prod/team-tasker/secrets";
const region = process.env.AWS_REGION || "us-east-1";

const client = new SecretsManagerClient({ region });

let cachedSecrets: AppSecrets | null = null;

export const loadSecrets = async (): Promise<AppSecrets> => {
  // Return from cache if already loaded
  if (cachedSecrets) {
    console.log("Loading secrets from cache.");
    return cachedSecrets;
  }

  console.log(`Fetching secrets from AWS Secrets Manager (name: ${secretName})`);

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT",
      })
    );

    if (response.SecretString) {
      const parsedSecrets = JSON.parse(response.SecretString) as AppSecrets;
      cachedSecrets = parsedSecrets; // Cache the secrets
      console.log("Successfully fetched and parsed secrets.");
      return parsedSecrets;
    } else {
      // Handle cases where the secret is binary (not common for this use case)
      throw new Error("SecretString is empty. Ensure the secret is stored as a key-value pair.");
    }
  } catch (error) {
    console.error("Failed to fetch secrets from AWS Secrets Manager:", error);
    // In a real application, you might want to exit if secrets are critical
    // for startup.
    throw error;
  }
};