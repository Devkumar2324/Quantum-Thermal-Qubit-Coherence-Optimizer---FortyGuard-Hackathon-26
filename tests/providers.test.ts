// Tests for the temperature provider integration layer.
import { describe, expect, it, beforeEach } from "bun:test";
import {
  FortyGuardTemperatureProvider,
  SyntheticTemperatureProvider,
  MockTemperatureProvider,
  getProvider,
} from "../src/lib/scientific/providers";
import { _resetFortyGuardClient } from "../src/lib/scientific/fortyguard-client";

describe("FortyGuardTemperatureProvider", () => {
  beforeEach(() => {
    _resetFortyGuardClient();
  });

  it("is unavailable when no API key is set", () => {
    const originalKey = process.env.FORTYGUARD_API_KEY;
    delete process.env.FORTYGUARD_API_KEY;
    _resetFortyGuardClient();
    const provider = new FortyGuardTemperatureProvider();
    expect(provider.available).toBe(false);
    expect(provider.name).toBe("FortyGuard");
    process.env.FORTYGUARD_API_KEY = originalKey;
    _resetFortyGuardClient();
  });

  it("is available when API key and base URL are set", () => {
    const originalKey = process.env.FORTYGUARD_API_KEY;
    const originalUrl = process.env.FORTYGUARD_BASE_URL;
    process.env.FORTYGUARD_API_KEY = "test-key";
    process.env.FORTYGUARD_BASE_URL = "https://api.test.com";
    _resetFortyGuardClient();
    const provider = new FortyGuardTemperatureProvider();
    expect(provider.available).toBe(true);
    process.env.FORTYGUARD_API_KEY = originalKey;
    process.env.FORTYGUARD_BASE_URL = originalUrl;
    _resetFortyGuardClient();
  });

  it("falls back to synthetic when unavailable and fetchCurrent is called", async () => {
    const originalKey = process.env.FORTYGUARD_API_KEY;
    delete process.env.FORTYGUARD_API_KEY;
    _resetFortyGuardClient();
    const provider = new FortyGuardTemperatureProvider();
    const obs = await provider.fetchCurrent("test-city");
    expect(obs.source).toBe("synthetic");
    expect(obs.city).toBe("test-city");
    process.env.FORTYGUARD_API_KEY = originalKey;
    _resetFortyGuardClient();
  });

  it("falls back to synthetic when unavailable and fetchHistory is called", async () => {
    const originalKey = process.env.FORTYGUARD_API_KEY;
    delete process.env.FORTYGUARD_API_KEY;
    _resetFortyGuardClient();
    const provider = new FortyGuardTemperatureProvider();
    const obs = await provider.fetchHistory("test-city", 6);
    expect(obs).toHaveLength(6);
    expect(obs.every((o) => o.source === "synthetic")).toBe(true);
    process.env.FORTYGUARD_API_KEY = originalKey;
    _resetFortyGuardClient();
  });
});

describe("SyntheticTemperatureProvider", () => {
  it("is always available", () => {
    const provider = new SyntheticTemperatureProvider();
    expect(provider.available).toBe(true);
  });

  it("has the correct name", () => {
    const provider = new SyntheticTemperatureProvider();
    expect(provider.name).toBe("Synthetic (Simulation Mode)");
  });

  it("returns a current observation", async () => {
    const provider = new SyntheticTemperatureProvider();
    const obs = await provider.fetchCurrent();
    expect(obs).toBeDefined();
    expect(typeof obs.temperatureC).toBe("number");
    expect(obs.source).toBe("synthetic");
    expect(obs.quality).toBe("good");
  });

  it("returns the requested number of history observations", async () => {
    const provider = new SyntheticTemperatureProvider();
    const obs = await provider.fetchHistory(undefined, 12);
    expect(obs).toHaveLength(12);
  });

  it("includes timestamps in chronological order", async () => {
    const provider = new SyntheticTemperatureProvider();
    const obs = await provider.fetchHistory(undefined, 6);
    for (let i = 1; i < obs.length; i++) {
      const prev = new Date(obs[i - 1].timestamp).getTime();
      const curr = new Date(obs[i].timestamp).getTime();
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("passes through the city parameter", async () => {
    const provider = new SyntheticTemperatureProvider();
    const obs = await provider.fetchCurrent("Test City");
    expect(obs.city).toBe("Test City");
  });
});

describe("MockTemperatureProvider", () => {
  it("is always available", () => {
    const provider = new MockTemperatureProvider();
    expect(provider.available).toBe(true);
  });

  it("returns a fixed current observation", async () => {
    const provider = new MockTemperatureProvider();
    const obs = await provider.fetchCurrent();
    expect(obs.temperatureC).toBe(25);
    expect(obs.source).toBe("synthetic");
  });

  it("returns the requested number of history observations", async () => {
    const provider = new MockTemperatureProvider();
    const obs = await provider.fetchHistory(undefined, 24);
    expect(obs).toHaveLength(24);
  });
});

describe("getProvider", () => {
  beforeEach(() => {
    _resetFortyGuardClient();
  });

  it("returns Synthetic provider when no FortyGuard key is set", () => {
    const originalKey = process.env.FORTYGUARD_API_KEY;
    delete process.env.FORTYGUARD_API_KEY;
    _resetFortyGuardClient();
    const provider = getProvider();
    expect(provider.name).toBe("Synthetic (Simulation Mode)");
    process.env.FORTYGUARD_API_KEY = originalKey;
    _resetFortyGuardClient();
  });

  it("returns FortyGuard provider when key is set", () => {
    const originalKey = process.env.FORTYGUARD_API_KEY;
    process.env.FORTYGUARD_API_KEY = "test-key";
    _resetFortyGuardClient();
    const provider = getProvider();
    expect(provider.name).toBe("FortyGuard");
    process.env.FORTYGUARD_API_KEY = originalKey;
    _resetFortyGuardClient();
  });
});
