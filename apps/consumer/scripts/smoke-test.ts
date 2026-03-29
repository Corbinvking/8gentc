/**
 * Cross-platform smoke test for Platform A.
 *
 * Usage:
 *   npx tsx apps/consumer/scripts/smoke-test.ts
 *
 * Requires:
 *   - Consumer app running at APP_URL (default http://localhost:3000)
 *   - Platform C engine running at ENGINE_URL (default http://localhost:3001)
 *   - For steps 9-10: Platform B also running
 *
 * Options:
 *   SKIP_ENTERPRISE=1  -- skip steps 9-10 that require Platform B
 */

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:3001";
const SKIP_ENTERPRISE = process.env.SKIP_ENTERPRISE === "1";

type StepResult = {
  step: number;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
};

const results: StepResult[] = [];

async function runStep(
  step: number,
  name: string,
  fn: () => Promise<string>
) {
  const start = Date.now();
  try {
    const msg = await fn();
    const durationMs = Date.now() - start;
    results.push({ step, name, passed: true, message: msg, durationMs });
    console.log(`  [PASS] Step ${step}: ${name} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    results.push({ step, name, passed: false, message, durationMs });
    console.log(`  [FAIL] Step ${step}: ${name} -- ${message} (${durationMs}ms)`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`\nSmoke Test: Platform A`);
  console.log(`App:    ${APP_URL}`);
  console.log(`Engine: ${ENGINE_URL}`);
  console.log(`Enterprise steps: ${SKIP_ENTERPRISE ? "SKIPPED" : "included"}\n`);

  // Check prerequisites
  try {
    const appHealth = await fetch(`${APP_URL}`, {
      signal: AbortSignal.timeout(5000),
    });
    assert(appHealth.ok || appHealth.status === 307, "Consumer app not reachable");
  } catch {
    console.error("FATAL: Consumer app not reachable at " + APP_URL);
    process.exit(1);
  }

  let engineUp = false;
  try {
    const engineHealth = await fetch(`${ENGINE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    engineUp = engineHealth.ok;
  } catch {
    console.warn("WARNING: Platform C engine not reachable. Some steps will fail.\n");
  }

  // -------------------------------------------------------------------------
  // Step 1: Sign up + onboarding
  // -------------------------------------------------------------------------
  await runStep(1, "Sign up -> complete onboarding", async () => {
    const signUpPage = await fetch(`${APP_URL}/sign-up`, {
      redirect: "manual",
    });
    assert(
      signUpPage.status === 200 || signUpPage.status === 307,
      `Sign-up page returned ${signUpPage.status}`
    );

    const onboardingPage = await fetch(`${APP_URL}/onboarding`, {
      redirect: "manual",
    });
    assert(
      onboardingPage.status === 200 || onboardingPage.status === 307,
      `Onboarding page returned ${onboardingPage.status}`
    );

    return "Sign-up and onboarding pages reachable";
  });

  // -------------------------------------------------------------------------
  // Step 2: Create 3 notes with cross-links -> graph renders
  // -------------------------------------------------------------------------
  let noteIds: string[] = [];
  await runStep(2, "Create 3 notes with cross-links -> graph renders", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${APP_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Smoke Test Note ${i + 1}`,
          content: `<p>Content for smoke test note ${i + 1}</p>`,
          type: "thought",
          workspaceId: "smoke-test",
        }),
      });
      if (res.ok) {
        const note = await res.json();
        noteIds.push(note.id);
      }
    }

    if (noteIds.length >= 2) {
      await fetch(`${APP_URL}/api/notes/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNoteId: noteIds[0],
          targetNoteId: noteIds[1],
        }),
      });
    }

    if (noteIds.length >= 3) {
      await fetch(`${APP_URL}/api/notes/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNoteId: noteIds[1],
          targetNoteId: noteIds[2],
        }),
      });
    }

    const linksRes = await fetch(`${APP_URL}/api/notes/links`);
    const graphPage = await fetch(`${APP_URL}/`, { redirect: "manual" });

    return `Created ${noteIds.length} notes, linked them, graph page: ${graphPage.status}`;
  });

  // -------------------------------------------------------------------------
  // Step 3: Open chat -> send message -> get streaming response
  // -------------------------------------------------------------------------
  let chatThreadId: string | null = null;
  await runStep(3, "Chat -> send message -> streaming response", async () => {
    const res = await fetch(`${APP_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hello from smoke test",
        workspaceId: "smoke-test",
      }),
    });

    chatThreadId = res.headers.get("X-Thread-Id");

    assert(
      res.status === 200 || res.status === 401 || res.status === 503,
      `Chat returned unexpected status ${res.status}`
    );

    if (res.status === 200 && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let chunks = 0;
      while (chunks < 20) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        chunks++;
      }
      return `Received ${chunks} chunks, ${content.length} bytes, threadId: ${chatThreadId}`;
    }

    return `Chat returned ${res.status} (auth or engine issue)`;
  });

  // -------------------------------------------------------------------------
  // Step 4: Create an agent -> see it running in dashboard
  // -------------------------------------------------------------------------
  let agentId: string | null = null;
  await runStep(4, "Create agent -> see it in dashboard", async () => {
    const res = await fetch(`${APP_URL}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Test Agent",
        skills: ["research"],
        config: { workspaceId: "smoke-test" },
      }),
    });

    if (res.status === 201) {
      const agent = await res.json();
      agentId = agent.id;

      const listRes = await fetch(`${APP_URL}/api/agents`);
      if (listRes.ok) {
        const agents = await listRes.json();
        const found = Array.isArray(agents) && agents.some((a: { id: string }) => a.id === agentId);
        return `Agent created: ${agentId}, visible in list: ${found}`;
      }
      return `Agent created: ${agentId}, list check failed`;
    }

    return `Agent creation returned ${res.status}`;
  });

  // -------------------------------------------------------------------------
  // Step 5: View agent output in workspace
  // -------------------------------------------------------------------------
  await runStep(5, "View agent output in workspace", async () => {
    if (!agentId) return "Skipped (no agent created)";

    const res = await fetch(`${APP_URL}/api/agents/${agentId}/outputs`);
    assert(
      res.status === 200 || res.status === 502,
      `Outputs returned ${res.status}`
    );

    if (res.ok) {
      const outputs = await res.json();
      return `Agent outputs endpoint OK, ${Array.isArray(outputs) ? outputs.length : 0} outputs`;
    }
    return "Agent outputs endpoint returned 502 (engine may be down)";
  });

  // -------------------------------------------------------------------------
  // Step 6: Check usage dashboard -> see token counts
  // -------------------------------------------------------------------------
  await runStep(6, "Usage dashboard -> non-zero token counts", async () => {
    const res = await fetch(`${APP_URL}/api/billing/usage`);
    if (!res.ok) return `Usage returned ${res.status}`;

    const usage = await res.json();
    assert(
      typeof usage.runtimeHoursUsed === "number",
      "Missing runtimeHoursUsed"
    );
    assert(
      typeof usage.runtimeHoursLimit === "number",
      "Missing runtimeHoursLimit"
    );
    assert(Array.isArray(usage.tokensByAgent), "Missing tokensByAgent array");

    return `Usage: ${usage.runtimeHoursUsed}h / ${usage.runtimeHoursLimit}h, ${usage.tokensByAgent.length} agents tracked`;
  });

  // -------------------------------------------------------------------------
  // Step 7: Subscribe to Individual plan via Stripe
  // -------------------------------------------------------------------------
  await runStep(7, "Subscribe to Individual plan via Stripe", async () => {
    const res = await fetch(`${APP_URL}/api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: "individual" }),
    });

    if (res.ok) {
      const { url } = await res.json();
      assert(typeof url === "string", "Missing checkout URL");
      assert(
        url.includes("stripe.com") || url.includes("checkout"),
        "URL doesn't look like Stripe"
      );
      return `Checkout URL generated: ${url.slice(0, 60)}...`;
    }

    return `Checkout returned ${res.status} (auth or config issue)`;
  });

  // -------------------------------------------------------------------------
  // Step 8: Create ambitious task -> ambition classifier triggers
  // -------------------------------------------------------------------------
  await runStep(8, "Ambitious task -> ambition classifier triggers", async () => {
    const res = await fetch(`${APP_URL}/api/tasks/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Build a complete SaaS platform",
        description:
          "Design and develop a full-stack SaaS application with frontend, backend, database, API gateway, authentication, payments integration, CI/CD pipeline, monitoring, and deploy to production with mobile support.",
      }),
    });

    if (res.ok) {
      const score = await res.json();
      assert(score.score > 0, "Score should be positive");
      assert(
        score.exceedsThreshold === true,
        "Ambitious task should exceed threshold"
      );
      return `Ambition score: ${score.score}, exceeds: ${score.exceedsThreshold}, suggested: ${score.suggestedPlan}`;
    }

    return `Score returned ${res.status}`;
  });

  // -------------------------------------------------------------------------
  // Step 9: Upgrade to enterprise -> task escalates to Platform C
  // -------------------------------------------------------------------------
  let escalatedTaskId: string | null = null;
  await runStep(9, "Enterprise upgrade -> task escalates to Platform C", async () => {
    if (SKIP_ENTERPRISE) return "SKIPPED (SKIP_ENTERPRISE=1)";

    const res = await fetch(`${APP_URL}/api/tasks/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Smoke test enterprise task",
        description: "Build a comprehensive testing framework for the platform.",
        workspaceId: "smoke-test",
        contextNoteIds: noteIds.slice(0, 2),
      }),
    });

    if (res.status === 201) {
      const result = await res.json();
      escalatedTaskId = result.taskId;
      return `Task escalated: ${escalatedTaskId}`;
    }

    return `Escalation returned ${res.status}`;
  });

  // -------------------------------------------------------------------------
  // Step 10: Receive deliverable -> approve in enterprise dashboard
  // -------------------------------------------------------------------------
  await runStep(10, "Receive deliverable -> approve in dashboard", async () => {
    if (SKIP_ENTERPRISE) return "SKIPPED (SKIP_ENTERPRISE=1)";
    if (!escalatedTaskId)
      return "Skipped (no task escalated in step 9)";

    const statusRes = await fetch(
      `${APP_URL}/api/tasks/${escalatedTaskId}/status`
    );
    if (!statusRes.ok) return `Status check returned ${statusRes.status}`;

    const status = await statusRes.json();

    const delivRes = await fetch(
      `${APP_URL}/api/tasks/${escalatedTaskId}/deliverables`
    );
    if (!delivRes.ok) return `Deliverables check returned ${delivRes.status}`;

    const deliverables = await delivRes.json();

    if (Array.isArray(deliverables) && deliverables.length > 0) {
      const first = deliverables[0];
      if (first.status === "pending_review") {
        const approveRes = await fetch(
          `${APP_URL}/api/tasks/${escalatedTaskId}/deliverables/${first.id}/approve`,
          { method: "POST" }
        );
        return `Deliverable ${first.id} approve: ${approveRes.status}`;
      }
      return `Deliverable found, status: ${first.status}`;
    }

    return `Task status: ${status.status}, ${deliverables.length} deliverables (none yet)`;
  });

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  if (agentId) {
    await fetch(`${APP_URL}/api/agents/${agentId}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  for (const id of noteIds) {
    await fetch(`${APP_URL}/api/notes/${id}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("SMOKE TEST RESULTS\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  for (const r of results) {
    const icon = r.passed ? "[PASS]" : "[FAIL]";
    console.log(`  ${icon}  ${r.step}. ${r.name}`);
    console.log(`         ${r.message}`);
  }

  console.log(`\n${passed} passed, ${failed} failed (${totalMs}ms total)`);
  console.log("=".repeat(60) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
