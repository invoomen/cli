import { callTool } from "../mcp-client.js";

interface BalanceResult {
    plan?: string;
    billing_cycle?: string;
    plan_credits_balance?: number | null;
    addon_credits_balance?: number | null;
    rollover_credits?: number | null;
    renewal_date?: string | null;
}

export async function balanceCommand(): Promise<void> {
    const result = await callTool<BalanceResult>("get_balance");
    const plan = result.plan ? `${result.plan} (${result.billing_cycle ?? "free"})` : "free";
    const planCredits = result.plan_credits_balance ?? 0;
    const addonCredits = result.addon_credits_balance ?? 0;
    const rolloverCredits = result.rollover_credits ?? 0;
    const total = planCredits + addonCredits + rolloverCredits;

    console.log("");
    console.log(`  Plan         ${plan}`);
    console.log(`  Plan credits ${planCredits.toLocaleString()}`);
    if (addonCredits > 0) console.log(`  Add-on       ${addonCredits.toLocaleString()}`);
    if (rolloverCredits > 0) console.log(`  Rollover     ${rolloverCredits.toLocaleString()}`);
    console.log(`  Total        ${total.toLocaleString()}`);
    if (result.renewal_date) {
        console.log(`  Renews       ${new Date(result.renewal_date).toLocaleDateString()}`);
    }
    console.log("");
}
