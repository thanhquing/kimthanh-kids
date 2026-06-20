import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "./config.schema";

/** Truy cập biến môi trường đã validate, type-safe. */
@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config.get(key, { infer: true });
  }

  get isProd(): boolean {
    return this.get("NODE_ENV") === "production";
  }

  get corsOrigins(): string[] | boolean {
    const raw = this.get("API_CORS_ORIGINS");
    if (raw === "*") return true;
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
