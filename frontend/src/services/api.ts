import { DashboardResponse, RescueResult, DeFiPosition, Strategy, InterventionPlan, SafetyBuffer } from '../types';

const API_BASE = '/api/v1';

export async function fetchDashboard(
  address: string,
  demo = false,
  scenario = 'SUCCESSFUL_RESCUE',
  includeExplanation = true
): Promise<DashboardResponse> {
  const params = new URLSearchParams({
    demo: demo ? 'true' : 'false',
    scenario,
    include_explanation: includeExplanation ? 'true' : 'false',
  });
  const res = await fetch(`${API_BASE}/dashboard/${address}?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function simulateRescue(
  position: DeFiPosition,
  strategies: Strategy[],
  intervention: InterventionPlan,
  safety: SafetyBuffer,
  forceAbort = false
): Promise<RescueResult> {
  const res = await fetch(`${API_BASE}/rescue/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      position,
      strategies,
      intervention,
      safety,
      force_abort: forceAbort,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Simulation request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkBackendHealth(): Promise<{ status: string; alchemy_configured: boolean; gemini_configured: boolean }> {
  try {
    const res = await fetch('/health');
    if (!res.ok) return { status: 'down', alchemy_configured: false, gemini_configured: false };
    return res.json();
  } catch {
    return { status: 'down', alchemy_configured: false, gemini_configured: false };
  }
}
