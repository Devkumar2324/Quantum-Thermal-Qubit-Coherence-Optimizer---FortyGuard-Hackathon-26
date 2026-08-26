# Optimization Methodology

## Problem Formulation

### Goal

**Maximize** qubit coherence **while minimizing** modeled cooling energy, subject to a minimum coherence constraint.

### Mathematical Formulation

```
minimize    J(T) = w_c · (1 - C(T)) + w_e · E_norm(T)
subject to  C(T) ≥ C_min
            T_min ≤ T ≤ T_max
```

where:
- `T` is the operating temperature (mK)
- `C(T)` is the coherence score at temperature T
- `E_norm(T) = E(T) / max_T E(T)` is the normalized cooling energy
- `w_c, w_e` are user-specified weights with `w_c + w_e = 1`
- `C_min` is the minimum coherence threshold (default 0.85)
- `T_min, T_max` are the temperature search bounds (default 10–100 mK)

## Two Optimization Approaches

The system implements two complementary approaches as specified in the project requirements.

### Approach A: Constrained Optimization

In this approach, we first apply the hard constraint `C(T) ≥ C_min` to filter the candidate set to feasible solutions, then select the feasible candidate with the lowest cooling energy.

**Algorithm**:
1. Enumerate candidate temperatures `T = T_min, T_min + ΔT, ..., T_max`.
2. For each candidate, compute `C(T)` and `E(T)`.
3. Filter to feasible candidates: `F = {T : C(T) ≥ C_min}`.
4. If `F` is non-empty, return `argmin_T∈F E(T)`.
5. Otherwise, return "no feasible solution" with guidance.

**Trade-off**: This approach strictly respects the coherence constraint but ignores the energy-coherence trade-off within the feasible set. It is useful when the constraint is non-negotiable.

### Approach B: Weighted Objective / Pareto Optimization

In this approach, we combine coherence and energy into a single weighted objective and identify the Pareto frontier of non-dominated solutions.

**Algorithm**:
1. Enumerate candidate temperatures.
2. For each candidate, compute the objective `J(T) = w_c · (1 - C(T)) + w_e · E_norm(T)`.
3. Identify the Pareto frontier — the set of non-dominated candidates where no other candidate has both higher coherence AND lower energy.
4. Select the optimal point as the Pareto-feasible candidate with the lowest `J`.

**Trade-off**: This approach explores the full trade-off space and identifies the mathematically optimal balance. It may select a point that slightly violates the constraint if no strictly feasible Pareto point exists.

### Combined Strategy

The system uses both approaches in concert:
1. Compute the full sweep with objective scores (Approach B).
2. Identify the Pareto frontier.
3. Filter Pareto points to feasible ones (`C ≥ C_min`).
4. Select the feasible Pareto point with lowest `J`.
5. If no feasible Pareto point exists, fall back to any feasible point.
6. If no feasible point exists at all, return "no feasible solution".

## Pareto Frontier Identification

### Definition

A candidate point `p` **dominates** `q` if and only if:
```
p.coherence ≥ q.coherence
AND p.energy ≤ q.energy
AND (p.coherence > q.coherence OR p.energy < q.energy)
```

The **Pareto frontier** is the set of all non-dominated points. No point on the frontier can be improved in one objective without degrading the other.

### Algorithm

```
pareto = []
for p in sweep:
    dominated = False
    for q in sweep:
        if q != p and q.dominates(p):
            dominated = True
            break
    if not dominated:
        pareto.append(p)
return pareto.sort_by_energy_ascending()
```

This is an O(n²) algorithm, which is fine for the default sweep size of 46 candidates. For larger sweeps, a more efficient algorithm (e.g., Kung's algorithm, O(n log n)) could be substituted.

## Objective Selection

Among the Pareto frontier, the optimal point is selected as the one minimizing the weighted objective `J`:

```
optimal = argmin_{p ∈ pareto ∩ feasible} J(p)
```

If `pareto ∩ feasible` is empty, fall back to `argmin_{p ∈ feasible} J(p)`. If `feasible` is empty, fall back to `argmin_{p ∈ pareto} J(p)`.

## Baseline Strategy

The baseline represents the conventional "colder is always better" cooling strategy: cool to a fixed aggressive low temperature regardless of coherence requirements.

**Default baseline**: T_baseline = 15 mK (configurable via `coolingParams.baselineTargetMK`).

The baseline uses the same coherence and cooling models, so the comparison is apples-to-apples.

## Comparison Metrics

The optimizer reports the following comparison metrics:

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| Energy saving % | `(E_baseline - E_optimized) / E_baseline · 100` | Positive = optimization saves energy |
| Coherence delta | `C_optimized - C_baseline` | Positive = optimization improves coherence |
| Risk delta | `risk(optimal) - risk(baseline)` | Negative = optimization reduces risk |
| Feasible count | `|{T : C(T) ≥ C_min}|` | Higher = more flexibility |
| Pareto count | `\|pareto\|` | Higher = richer trade-off space |
| Optimization score | `J(optimal)` | Lower = better objective |

## Weight Selection Guidance

The weights `w_c` and `w_e` control the trade-off bias:

| Weight Setting | Behavior |
|----------------|----------|
| `w_c = 1.0, w_e = 0.0` | Pure coherence maximization (likely selects coldest T) |
| `w_c = 0.7, w_e = 0.3` | Balanced (default) |
| `w_c = 0.5, w_e = 0.5` | Equal weight |
| `w_c = 0.3, w_e = 0.7` | Energy-leaning |
| `w_c = 0.0, w_e = 1.0` | Pure energy minimization (likely selects warmest feasible T) |

**Default**: `w_c = 0.7, w_e = 0.3` — coherence-leaning because in quantum computing, coherence is typically the binding constraint.

## Constraint Handling

### No Feasible Solution

If no candidate temperature satisfies `C(T) ≥ C_min`, the optimizer returns:

```
status: "no-feasible-solution"
message: "No operating temperature in the selected range satisfies the required 
          coherence threshold. Consider expanding the temperature range, lowering 
          the coherence threshold, or improving cooling assumptions."
```

**Suggested remediations**:
1. Expand the temperature range (lower `T_min`).
2. Lower the coherence threshold `C_min`.
3. Improve cooling assumptions (increase Carnot efficiency).
4. Review quantum parameters (increase target T1/T2, reduce noise).

### Numerical Stability

- All divisions are guarded against zero with `Math.max(ε, denominator)`.
- T1 is clamped to a minimum of 0.1 µs.
- T2 is clamped to a minimum of 0.05 µs.
- Coherence score is clamped to [0, 1].
- Thermal noise score is clamped to [0, 1].
- The COP is clamped to a minimum of 10⁻¹² (effectively zero, but prevents division errors).

## Performance

The default sweep (46 candidates from 10 mK to 100 mK, 2 mK step) completes in under 100ms on commodity hardware. The Pareto identification adds negligible overhead. The system supports 100+ candidate temperatures and multiple scenarios without performance issues.

## Replacing the Optimizer

The optimizer is intentionally modular. To replace it with a more sophisticated algorithm (e.g., genetic algorithm, Bayesian optimization, gradient-based methods), implement a function with the signature:

```typescript
function optimize(req: OptimizationRequest): OptimizationResult
```

and register it in `src/lib/scientific/optimizer.ts`. The rest of the system (API, dashboard, experiments) will continue to work unchanged.
