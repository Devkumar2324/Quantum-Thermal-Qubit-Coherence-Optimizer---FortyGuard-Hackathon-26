# API Reference

## Base URL

All API routes are served from the Next.js application at relative paths. In production, prefix with your deployment URL.

## Authentication

API routes do not require authentication for the hackathon prototype. The FortyGuard API key is read server-side from the `FORTYGUARD_API_KEY` environment variable and never exposed to the client.

## Endpoints

### Health

#### `GET /api/health`

Returns the service status and FortyGuard integration availability.

**Response**:
```json
{
  "status": "ok",
  "service": "quantum-thermal-coherence-optimizer",
  "version": "0.1.0",
  "thermalProvider": "Synthetic (Simulation Mode)",
  "fortyGuardAvailable": false,
  "timestamp": "2026-08-25T14:30:00.000Z",
  "simulationMode": true
}
```

---

### Thermal

#### `GET /api/thermal/current`

Returns the latest thermal observation.

**Query Parameters**:
- `city` (optional): City name to fetch temperature for.

**Response**:
```json
{
  "provider": "Synthetic (Simulation Mode)",
  "available": true,
  "observation": {
    "timestamp": "2026-08-25T14:30:00.000Z",
    "temperatureC": 25.4,
    "source": "synthetic",
    "quality": "good",
    "city": "Demo Site",
    "scenario": "normal"
  }
}
```

**Notes**:
- If `FORTYGUARD_API_KEY` is set, returns real FortyGuard data with `source: "fortyguard"`.
- If the API is unavailable or no key is set, returns synthetic data with `source: "synthetic"`.

---

#### `GET /api/thermal/history`

Returns a historical series of thermal observations with processed summary.

**Query Parameters**:
- `hours` (optional, default: 24): Number of hours of history to retrieve.
- `scenario` (optional, default: "normal"): Scenario preset for synthetic data generation.
- `city` (optional): City name for FortyGuard queries.

**Response**:
```json
{
  "provider": "Synthetic (Simulation Mode)",
  "available": true,
  "observations": [
    { "timestamp": "...", "temperatureC": 24.1, "source": "synthetic", "scenario": "normal" },
    ...
  ],
  "processed": {
    "current": 25.4,
    "movingAverage": 24.8,
    "anomaly": 0.6,
    "rateOfChange": 0.15,
    "forecast": 25.6,
    "history": [24.1, 24.3, ...],
    "forecastSeries": [25.6, 25.8, ...]
  },
  "scenario": "normal"
}
```

---

#### `POST /api/thermal/simulate`

Generates a custom ambient simulation scenario.

**Request Body**:
```json
{
  "baseC": 28,
  "deltaC": 5,
  "hours": 12
}
```

**Response**:
```json
{
  "observations": [
    { "timestamp": "...", "temperatureC": 28.0, "source": "synthetic", "scenario": "custom" },
    ...
  ],
  "processed": { ... },
  "provider": "Custom Simulation"
}
```

---

### Quantum Configurations

#### `GET /api/quantum/configurations`

Lists all saved quantum system configurations.

**Response**:
```json
{
  "configurations": [
    {
      "id": "cuid...",
      "name": "Demo Superconducting Qubit System",
      "qubitType": "superconducting",
      "qubitCount": 50,
      "qubitFrequencyGHz": 5.0,
      "targetCoherence": 0.9,
      "targetT1Microseconds": 100,
      "targetT2Microseconds": 80,
      "minCoherence": 0.85,
      "temperatureMinMK": 10,
      "temperatureMaxMK": 100,
      "temperatureStepMK": 2,
      "noiseParams": { ... },
      "coolingParams": { ... }
    }
  ]
}
```

---

#### `POST /api/quantum/configurations`

Creates a new quantum system configuration.

**Request Body**:
```json
{
  "name": "Custom Trapped Ion System",
  "qubitType": "trapped-ion",
  "qubitCount": 32,
  "qubitFrequencyGHz": 1.5,
  "targetCoherence": 0.92,
  "targetT1Microseconds": 500,
  "targetT2Microseconds": 200,
  "minCoherence": 0.85,
  "temperatureMinMK": 10,
  "temperatureMaxMK": 100,
  "temperatureStepMK": 2,
  "noiseParams": { ... },
  "coolingParams": { ... }
}
```

**Response**: The created configuration object.

---

### Optimization

#### `POST /api/optimize`

Runs the multi-objective optimization and optionally persists the result as an experiment.

**Request Body**:
```json
{
  "config": { ... },         // QuantumSystemConfig
  "ambientC": 25,             // Ambient temperature in °C
  "weights": {
    "coherence": 0.7,
    "energy": 0.3
  },
  "minCoherence": 0.85,       // Optional, defaults to config.minCoherence
  "durationHours": 24,        // Optional, defaults to 24
  "persist": true,            // Optional, persist as experiment
  "experimentName": "..."     // Optional, auto-generated if omitted
}
```

**Response**: An `OptimizationResult` object:
```json
{
  "sweep": [ ... ],           // Per-candidate SweepPoint[]
  "pareto": [ ... ],          // Pareto-frontier SweepPoint[]
  "optimal": { ... },         // Selected SweepPoint or null
  "baseline": {
    "point": { ... },
    "energyKWh": 1409.56,
    "coherence": 0.964
  },
  "metrics": {
    "energySavingPercent": 45.2,
    "coherenceDelta": -0.005,
    "riskDelta": 0,
    "feasibleCount": 13,
    "infeasibleCount": 33,
    "paretoCount": 46,
    "optimizationScore": 0.094
  },
  "weights": { "coherence": 0.7, "energy": 0.3 },
  "minCoherence": 0.85,
  "noFeasibleSolution": false,
  "message": "Optimal operating point identified at 28 mK...",
  "experimentId": "cuid..."
}
```

---

### Experiments

#### `GET /api/experiments`

Lists all persisted experiments, most recent first.

**Response**:
```json
{
  "experiments": [
    {
      "id": "cuid...",
      "name": "Demo System · normal · 2026-08-25",
      "scenario": "custom",
      "ambientTemp": 25.0,
      "tempMin": 10,
      "tempMax": 100,
      "tempStep": 2,
      "coherenceWeight": 0.7,
      "energyWeight": 0.3,
      "minCoherence": 0.85,
      "status": "completed",
      "optimalTemp": 28,
      "optimalCoherence": 0.959,
      "optimalEnergy": 771.78,
      "baselineEnergy": 1409.56,
      "energySavings": 45.2,
      "createdAt": "2026-08-25T14:30:00.000Z",
      "config": { "name": "Demo Superconducting Qubit System", ... }
    }
  ]
}
```

---

#### `POST /api/experiments`

Manually creates an experiment record (alternative to the `persist` flag on `/api/optimize`).

**Request Body**: The full experiment payload.

**Response**: The created experiment object.

---

#### `GET /api/experiments/[id]`

Fetches a single experiment with full results, including the complete sweep data and Pareto frontier.

**Response**:
```json
{
  "experiment": {
    "id": "cuid...",
    "name": "...",
    "scenario": "custom",
    "ambientTemp": 25.0,
    "tempMin": 10,
    "tempMax": 100,
    "tempStep": 2,
    "coherenceWeight": 0.7,
    "energyWeight": 0.3,
    "minCoherence": 0.85,
    "status": "completed",
    "optimalTemp": 28,
    "optimalCoherence": 0.959,
    "optimalEnergy": 771.78,
    "baselineEnergy": 1409.56,
    "energySavings": 45.2,
    "createdAt": "2026-08-25T14:30:00.000Z",
    "config": { ... },
    "paretoFrontier": [ ... ],
    "sweepResults": [ ... ],
    "agentDecisions": [ ... ]
  }
}
```

---

### AI Agent

#### `POST /api/agent/explain`

Generates an LLM-based explanation of an optimization result.

**Request Body**:
```json
{
  "optimization": { ... },     // OptimizationResult
  "thermal": { "summary": [...] },
  "config": { ... },           // QuantumSystemConfig
  "scenario": "normal"
}
```

**Response**:
```json
{
  "explanation": "The optimization selected 28 mK as the optimal operating temperature...",
  "model": "z-ai-web-dev-sdk",
  "timestamp": "2026-08-25T14:30:00.000Z"
}
```

**Notes**:
- The LLM is used ONLY for explanation/interpretation.
- All numerical values come from the deterministic scientific code.
- The LLM never performs mathematical optimization.

---

#### `POST /api/agent/analyze`

Logs an agent decision to the database.

**Request Body**:
```json
{
  "trigger": "manual",         // or "thermal_alert" or "scheduled"
  "observation": { ... },      // JSON summary of inputs
  "recommendation": "...",     // Natural language
  "recommendedTemp": 28,
  "predictedCoherence": 0.959,
  "predictedEnergy": 771.78,
  "experimentId": "cuid..."
}
```

**Response**: The created `AgentDecision` record.

---

#### `GET /api/agent/analyze`

Lists recent agent decisions, most recent first.

**Response**:
```json
{
  "decisions": [
    {
      "id": "cuid...",
      "timestamp": "...",
      "trigger": "manual",
      "observation": "{...}",
      "recommendation": "...",
      "recommendedTemp": 28,
      "predictedCoherence": 0.959,
      "predictedEnergy": 771.78,
      "status": "logged",
      "experiment": { ... }
    }
  ]
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (invalid input, missing required field) |
| 404 | Resource not found |
| 500 | Internal server error (with error message in response body) |
| 503 | Service unavailable (database not initialized) |

Error responses have the format:
```json
{
  "error": "Description of the error"
}
```

## Rate Limiting

No rate limiting is implemented in the hackathon prototype. Production deployments should add rate limiting, especially for the `/api/optimize` and `/api/agent/explain` endpoints.
