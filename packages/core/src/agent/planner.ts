import type { SentientPage } from '../browser/chromium.js';
import type { PlannerGoal, PlannerResult, PlannerStep, PlannerStepAction } from './types.js';

/**
 * Autonomous Goal Planner that takes a natural language objective,
 * inspects the pruned Semantic DOM, reasons about the next best action,
 * dispatches intent actions, tracks real-time diffs, and returns the final answer.
 */
export class AutonomousPlanner {
  constructor(private page: SentientPage) {}

  async solve(goalInput: PlannerGoal | string): Promise<PlannerResult> {
    const goal: PlannerGoal = typeof goalInput === 'string' ? { goal: goalInput } : goalInput;
    const maxSteps = goal.maxSteps || 8;
    const timeoutMs = goal.timeoutMs || 30000;
    const startTime = Date.now();
    const steps: PlannerStep[] = [];

    let consecutiveNoDiff = 0;

    for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
      if (Date.now() - startTime > timeoutMs) {
        return {
          success: false,
          goal: goal.goal,
          stepsCount: steps.length,
          steps,
          durationMs: Date.now() - startTime,
          error: `Planner timed out after ${timeoutMs}ms.`
        };
      }

      // 1. Capture current semantic state
      const snapshot = await this.page.getSemanticDOM();

      // 2. Decide next action (via LLM or heuristic fallback)
      let action: PlannerStepAction;
      if (goal.llmCaller) {
        action = await this.decideWithLLM(goal.goal, snapshot, steps, goal.llmCaller);
      } else {
        action = this.decideWithHeuristic(goal.goal, snapshot, steps);
      }

      // 3. Handle finish action
      if (action.type === 'finish') {
        const step: PlannerStep = {
          stepNumber,
          action,
          timestamp: Date.now()
        };
        steps.push(step);
        goal.onStep?.(step);

        return {
          success: true,
          goal: goal.goal,
          answer: action.answer || 'Goal reached successfully.',
          stepsCount: steps.length,
          steps,
          durationMs: Date.now() - startTime
        };
      }

      // 4. Handle rollback action
      if (action.type === 'rollback') {
        const diff = await this.page.rollback();
        const step: PlannerStep = {
          stepNumber,
          action,
          diffSummary: diff.compact,
          timestamp: Date.now()
        };
        steps.push(step);
        goal.onStep?.(step);
        continue;
      }

      // 5. Execute browser intent action
      let diffCompact = '';
      try {
        if (action.type === 'click' && action.target) {
          const diff = await this.page.click(action.target);
          diffCompact = diff.compact;
          if (diff.operationsCount === 0) consecutiveNoDiff++;
          else consecutiveNoDiff = 0;
        } else if (action.type === 'fill' && action.target) {
          const diff = await this.page.fill(action.target, action.text || '');
          diffCompact = diff.compact;
          consecutiveNoDiff = 0;
        } else if (action.type === 'hover' && action.target) {
          const diff = await this.page.hover(action.target);
          diffCompact = diff.compact;
        } else if (action.type === 'scroll') {
          const diff = await this.page.scroll({ direction: action.direction || 'down' });
          diffCompact = diff.compact;
        }
      } catch (err: any) {
        diffCompact = `Error: ${err.message}`;
        consecutiveNoDiff++;
      }

      const step: PlannerStep = {
        stepNumber,
        action,
        diffSummary: diffCompact,
        timestamp: Date.now()
      };
      steps.push(step);
      goal.onStep?.(step);

      // Auto self-healing rollback if stuck on consecutive no-diff clicks
      if (consecutiveNoDiff >= 2 && stepNumber < maxSteps) {
        await this.page.rollback().catch(() => {});
        consecutiveNoDiff = 0;
      }
    }

    return {
      success: false,
      goal: goal.goal,
      stepsCount: steps.length,
      steps,
      durationMs: Date.now() - startTime,
      error: `Exceeded maximum steps (${maxSteps}) without finishing.`
    };
  }

  private async decideWithLLM(
    goal: string,
    snapshot: any,
    history: PlannerStep[],
    llmCaller: (prompt: string) => Promise<string>
  ): Promise<PlannerStepAction> {
    const interactives = snapshot.nodes
      .filter((n: any) => n.clickable || n.role === 'button' || n.role === 'link' || n.role === 'textbox')
      .map((n: any) => `- [${n.role.toUpperCase()}] id="${n.id}" text="${n.text || n.placeholder || ''}"`)
      .slice(0, 40)
      .join('\n');

    const historySummary = history
      .map((s) => `Step ${s.stepNumber}: ${s.action.type}(${s.action.target || ''}) -> ${s.diffSummary || 'done'}`)
      .join('\n');

    const prompt = `You are an autonomous browser agent navigating a webpage to achieve a goal.
Goal: "${goal}"
Current URL: ${snapshot.url}
Page Title: ${snapshot.title}

Available Interactive Action Targets:
${interactives}

Past Actions & State Observations:
${historySummary || 'None (Initial Step)'}

Respond with a JSON object containing your reasoning and your chosen next action:
{
  "reasoning": "Explanation of your plan",
  "action": {
    "type": "click" | "fill" | "scroll" | "hover" | "rollback" | "finish",
    "target": "target_stable_id",
    "text": "text if fill action",
    "direction": "down" | "up",
    "answer": "final answer if finish"
  }
}`;

    try {
      const raw = await llmCaller(prompt);
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.action || { type: 'finish', answer: raw };
    } catch (_) {
      return { type: 'finish', answer: 'Unable to parse LLM response.' };
    }
  }

  /**
   * Deterministic semantic heuristic engine used when no LLM key is supplied.
   * Matches goal keywords against accessible names, heading texts, and action IDs.
   */
  private decideWithHeuristic(
    goal: string,
    snapshot: any,
    history: PlannerStep[]
  ): PlannerStepAction {
    const goalLower = goal.toLowerCase();
    const keywords = goalLower.split(/\s+/).filter((w) => w.length > 2);

    const synonymMap: Record<string, string[]> = {
      plan: ['pricing', 'plans', 'price', 'tier', 'cost'],
      plans: ['pricing', 'price', 'tier', 'cost'],
      pricing: ['plans', 'plan', 'price', 'tier', 'costs'],
      starter: ['pricing', 'plans', 'tier', 'free'],
      user: ['member', 'members', 'users', 'seats', 'team'],
      users: ['member', 'members', 'seats', 'team']
    };

    // 1. If we took an action in previous steps, inspect new text on the page for the answer
    const textNodes = snapshot.nodes.filter((n: any) => n.text && n.text.length > 0);
    if (history.length > 0) {
      for (const node of textNodes) {
        const textLower = node.text.toLowerCase();
        let matchCount = 0;
        for (const kw of keywords) {
          if (textLower.includes(kw)) matchCount++;
        }
        if (matchCount >= 2 || (matchCount >= 1 && (textLower.includes('member') || textLower.includes('starter') || textLower.includes('$') || textLower.includes('free')))) {
          return {
            type: 'finish',
            answer: node.text,
            reasoning: `Found matching text on page after action: "${node.text}"`
          };
        }
      }
    }

    // 2. Find target that best matches goal keywords and has not been clicked yet
    const clickedTargets = new Set(history.filter((s) => s.action.target).map((s) => s.action.target));
    const candidates = snapshot.nodes.filter(
      (n: any) =>
        (n.clickable || n.role === 'button' || n.role === 'link') &&
        !clickedTargets.has(n.id)
    );

    let bestCandidate: any = null;
    let maxScore = -1;

    for (const cand of candidates) {
      let score = 0;
      const idLower = cand.id.toLowerCase();
      const textLower = (cand.text || '').toLowerCase();

      for (const kw of keywords) {
        if (idLower.includes(kw)) score += 3;
        if (textLower.includes(kw)) score += 2;

        const syns = synonymMap[kw] || [];
        for (const syn of syns) {
          if (idLower.includes(syn)) score += 2;
          if (textLower.includes(syn)) score += 1.5;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = cand;
      }
    }

    if (bestCandidate && maxScore > 0) {
      return {
        type: 'click',
        target: bestCandidate.id,
        reasoning: `Selected candidate "${bestCandidate.id}" with score ${maxScore}.`
      };
    }

    // 3. Fallback: scroll down to reveal more content if available
    const hasScrolled = history.some((s) => s.action.type === 'scroll');
    if (!hasScrolled) {
      return {
        type: 'scroll',
        direction: 'down',
        reasoning: 'Scrolling to reveal additional page content.'
      };
    }

    // 4. Default: finish with summary
    return {
      type: 'finish',
      answer: `Inspected page "${snapshot.title}" (${snapshot.url}) with ${snapshot.totalNodes} semantic nodes.`,
      reasoning: 'No further actions identified.'
    };
  }
}
