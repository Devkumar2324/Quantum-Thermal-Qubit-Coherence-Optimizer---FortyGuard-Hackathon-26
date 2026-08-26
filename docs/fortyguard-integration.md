# FortyGuard API Integration

## Overview

This document describes how the Quantum-Thermal Qubit Coherence Optimizer integrates with the real **FortyGuard Temperature API®**. The integration follows the official API specification at [docs-api.fortyguard.com](https://docs-api.fortyguard.com/docs/introduction).

## The Corrected Architecture

The key scientific distinction (confirmed after reading the real API docs):

```
              FORTYGUARD API
              ┌──────┴───────┐
       POST /v1/heatmap    POST /v1/env_params
              │             (uses temperature from heatmap)
              ↓             ↓
       Temperature °C    Humidity, Solar GHI/DNI/DHI,
       (mean/min/max)    Wet-bulb, Heat index
              │             │
              └──────┬──────┘
                     ↓
          ENVIRONMENTAL THERMAL CONDITIONS
          (the real, defensible input layer)
                     ↓
        ┌──────────────────────────┐
        │ Thermal Management /     │
        │ Cooling Model            │
        │ - Carnot COP (core)      │
        │ + Solar heat gain (NEW)  │
        │ + Humidity COP (NEW)     │
        │ + Wet-bulb limit (NEW)   │
        └────────────┬─────────────┘
                     ↓
          QUANTUM OPERATING CONDITIONS
          (qubit temperature in mK — controlled variable)
                     ↓
        ┌──────────────────────────┐
        │ Quantum Thermal /        │
        │ Noise Model              │
        │ (Bose-Einstein, T1, T2)  │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │ Qubit Coherence          │
        │ Prediction               │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │ Cooling Energy Model     │
        │ (uses env params + COP)  │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │ Multi-Objective          │
        │ Optimizer                │
        └────────────┬─────────────┘
                     ↓
       ┌────────────────────────────┐
       │  OPTIMAL OPERATING POINT   │
       │  Max coherence / min energy│
       └────────────────────────────┘
```

**Critical**: FortyGuard provides **environmental intelligence** — NOT qubit temperature. The qubit temperature is a controlled variable that the optimizer selects. This is the defensible architecture.

## API Specifications

### Base Configuration

| Property | Value |
|---|---|
| Base URL | `https://api.fortyguard.com/v1/` |
| Authentication | `api-key: YOUR_API_KEY` header (no OAuth) |
| Pattern | **Async** — POST returns `activity_id`, poll `GET /v1/status/{activity_id}` |
| Geographic coverage | **United States only** |
| Date range | 2019-01-01 → now+12h (heatmap supports 12h forecast) |
| Credits | 1M/month Basic, 5M/month Premium — **deducted only on success** |

### Endpoints Used

#### 1. `POST /v1/heatmap` (PRIMARY — ambient temperature)

**Plan**: Both Basic and Premium

**Purpose**: Generates high-resolution GeoJSON thermal maps. We extract the aggregated statistics (min/max/mean/stddev) to get the ambient temperature for a location.

**Request**:
```json
{
  "polygon_aoi": {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-112.079, 33.443], [-112.069, 33.443], [-112.069, 33.453], [-112.079, 33.453], [-112.079, 33.443]]]
      }
    }]
  },
  "date_time": {
    "start_date": "2026-08-25",
    "start_time": "14:00",
    "filter_type": 1
  },
  "granularity": 100,
  "analytic_type": "tcm"
}
```

**Response** (after polling `GET /v1/status/{activity_id}`):
```json
{
  "data": {
    "activity_id": "f52d2453-...",
    "status": "Completed",
    "result": {
      "map_data": { /* GeoJSON */ },
      "stats_data": {
        "Temperature_stats": {
          "Minimum": 28.4,
          "Maximum": 41.7,
          "Mean": 35.2,
          "Standard_deviation": 2.8
        }
      }
    }
  }
}
```

**We extract**: `stats_data.Temperature_stats.Mean` as `temperatureC` for our `ThermalObservation`.

**Forecast support**: Setting `start_date`/`start_time` to a future timestamp (within 12h) returns forecasted temperatures — this powers the **Predictive strategy**.

---

#### 2. `POST /v1/env_params` (CRITICAL — cooling model inputs)

**Plan**: Both Basic (3 params max) and Premium (all params)

**Purpose**: Returns full environmental parameters including humidity, solar irradiance, wet-bulb temperature — all of which materially affect cooling system performance.

**Request**:
```json
{
  "latitude": 33.4484,
  "longitude": -112.074,
  "temperature": 35.2,
  "date_time": {
    "start_date": "2026-08-25",
    "start_time": "14:00",
    "filter_type": 1
  }
}
```

**Response**:
```json
{
  "data": {
    "result": {
      "metadata": { "timezone": "America/Phoenix", "time_range": { "start": "...", "end": "..." } },
      "locations": [{
        "lat": 33.4484,
        "lon": -112.074,
        "elevation": 331,
        "temperature": 35.2,
        "parameters": {
          "heat_index_celsius": [36.8],
          "apparent_temperature_celsius": [34.9],
          "wet_bulb_temperature_celsius": [19.2],
          "relative_humidity_percent": [22],
          "precipitation_mm": [0],
          "cloud_cover_octas": [2]
        },
        "solar_irradiance": {
          "clear_sky": { "ghi": 940, "dni": 850, "dhi": 90 }
        }
      }]
    }
  }
}
```

**We extract** into our `EnvironmentalConditions` type:
- `relative_humidity_percent` → `humidityPercent`
- `wet_bulb_temperature_celsius` → `wetBulbC`
- `solar_irradiance.clear_sky.ghi` → `solarGHI`
- `solar_irradiance.clear_sky.dni` → `solarDNI`
- `solar_irradiance.clear_sky.dhi` → `solarDHI`
- `heat_index_celsius` → `heatIndexC`

---

#### 3. `GET /v1/status/{activity_id}` (polling)

Used to poll all submitted tasks until `status === "Completed"`.

---

#### 4. `POST /v1/system/fetch-api-key-usage` (credits)

Used by the `/api/fortyguard/credits` endpoint to display remaining credits in the Settings section.

---

### Endpoints NOT Used

- `POST /v1/heat_intelligence` — returns a PDF report (Premium only). Not suitable for real-time pipeline, but could power a future "Generate Report" button.
- `POST /v1/satellite` — returns Base64 imagery. Not relevant to thermal optimization.
- `POST /v1/streetview` — returns Base64 imagery. Not relevant.

## Implementation

### Client: `src/lib/scientific/fortyguard-client.ts`

A typed TypeScript client that handles:
- API key authentication via `api-key` header
- Async task submission and polling
- Bounded retry with configurable interval and timeout (default: 5s interval, 5min timeout)
- US-only location validation
- Date/time formatting helpers
- Singleton pattern with reset for testing

### Provider: `src/lib/scientific/providers.ts`

The `FortyGuardTemperatureProvider`:
1. Calls `fetchAmbientTemperature(lat, lon, date, time)` — submits a small heatmap (0.01° box) and returns the mean temperature.
2. Calls `fetchEnvironmentalParams(lat, lon, tempC, date, time)` — submits an env_params request and returns the full environmental conditions.
3. Combines both into a `ThermalObservation` with `source: "fortyguard"` and full `environment` context.
4. `fetchForecast(hours, city, lat, lon)` — fetches a 12-hour forecast by submitting heatmap tasks with future `start_date`/`start_time`.
5. **Graceful fallback**: Any API failure falls back to `SyntheticTemperatureProvider` with `source: "synthetic"`.

### Enhanced Cooling Model: `src/lib/scientific/cooling.ts`

Three new environmental terms layered on top of the Carnot COP:

1. **Solar heat gain**: `Q_solar = solar_absorptivity × GHI × roof_area` (W) — added to Q_load
2. **Humidity COP factor**: `cop *= (1.0 - 0.3 × humidity/100)` — degrades with high humidity
3. **Wet-bulb limit factor**: `cop *= (0.85 + 0.15 × min(1, evap_range/10))` — penalizes small evaporative cooling range

All three terms are optional — the model works without them (backward compatible) but produces more realistic energy estimates when environmental data is available.

### Three-Strategy Comparison: `src/lib/scientific/strategies.ts`

The novel research contribution:

- **Strategy A — Fixed**: Always cool to `baselineTargetMK` (default 15 mK). Baseline reference.
- **Strategy B — Reactive**: Re-optimize each hour based on current ambient. Adapts to current conditions.
- **Strategy C — Predictive** ⭐: Look ahead N hours (default 2), find the worst-case ambient in the window, optimize against that. Pre-positions the operating point before thermal stress arrives.

Each strategy is evaluated over the same forecast window. The comparison reports:
- Total modeled energy (kWh)
- Min/mean coherence
- Constraint violations
- Energy savings (% vs Fixed, % vs Reactive)

## Demo City Presets

Six US cities spanning diverse climate zones:

| City | State | Climate | Best Demo Of |
|------|-------|---------|-------------|
| Phoenix | AZ | Hot desert | Extreme heat, solar gain |
| Austin | TX | Humid subtropical | Wet-bulb limits, humidity COP |
| New York | NY | Humid continental | Diurnal swing, forecast value |
| Seattle | WA | Oceanic | Mild baseline comparison |
| Miami | FL | Tropical monsoon | Sustained heat + humidity |
| Denver | CO | Semi-arid | High elevation, intense solar |

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/thermal/current?city=phoenix` | Current temp + env params |
| GET | `/api/thermal/history?hours=24&city=phoenix` | Historical series |
| GET | `/api/thermal/forecast?hours=12&city=phoenix` | 12h forecast |
| POST | `/api/thermal/simulate` | Custom ambient scenario |
| POST | `/api/optimize` | Run optimization (with env) |
| POST | `/api/strategies/compare` | Run all 3 strategies |
| GET | `/api/fortyguard/status` | API configured? |
| GET | `/api/fortyguard/credits` | Credit usage |

## Setup

1. Get an API key from FortyGuard (Basic or Premium).
2. Add to `.env.local`:
   ```
   FORTYGUARD_API_KEY=your_real_key_here
   FORTYGUARD_BASE_URL=https://api.fortyguard.com
   ```
3. Restart the dev server.
4. The dashboard status badge switches from "Simulation Mode" to "FortyGuard Live".

## Credit Conservation

FortyGuard deducts credits only on successful task completion. To conserve credits in the demo:

- History fetches sample every 4 hours (6 calls for 24h history) instead of every hour.
- Forecast fetches sample every 2 hours (6 calls for 12h forecast).
- Each call submits a small 0.01° polygon (~1 km²) at granularity 100m.
- Premium plan: 5M credits/month — demo budget is ample.
- Basic plan: 1M credits/month — still ample for a 3-minute demo.

## Error Handling

- **No API key** → Fall back to `SyntheticTemperatureProvider` (clearly labeled "Simulation Mode")
- **Non-US coordinates** → Fall back to synthetic
- **API failure (401/403/429/500)** → Fall back to synthetic for that observation
- **Polling timeout** → Throw with descriptive error
- **Failed activity** → Throw with activity_id for debugging

## Scientific Honesty

- All FortyGuard data is labeled with `source: "fortyguard"`.
- All synthetic data is labeled with `source: "synthetic"`.
- The forecast source is recorded in the `StrategyComparison.forecastWindow.source` field.
- The dashboard displays the source badge prominently so judges can see whether real or synthetic data was used.

## References

- [FortyGuard API Documentation](https://docs-api.fortyguard.com/docs/introduction)
- [FortyGuard Quickstart](https://docs-api.fortyguard.com/docs/quickstart)
- [FortyGuard Authentication](https://docs-api.fortyguard.com/docs/authentication)
- [FortyGuard Known Limitations](https://docs-api.fortyguard.com/docs/known-limitations)
