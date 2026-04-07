import { GoalMode, Metric } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getGoalsByUserId = vi.fn();
const upsertGoalsByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/goals-service", () => ({
  getGoalsByUserId,
  upsertGoalsByUserId,
}));

describe("goals route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/goals/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("returns the active user's goals", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });
    getGoalsByUserId.mockResolvedValue([
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 8,
        minValue: null,
        maxValue: null,
      },
    ]);

    const { GET } = await import("@/app/api/goals/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getGoalsByUserId).toHaveBeenCalledWith("user_1");
    expect(data.goals[0].metric).toBe(Metric.SLEEP);
  });

  it("updates goals for the active user", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });
    upsertGoalsByUserId.mockResolvedValue([
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 8,
        minValue: null,
        maxValue: null,
      },
      {
        metric: Metric.WEIGHT,
        mode: GoalMode.IN_RANGE,
        isActive: true,
        targetValue: null,
        minValue: 58,
        maxValue: 62,
      },
      {
        metric: Metric.WATER,
        mode: GoalMode.AT_LEAST,
        isActive: false,
        targetValue: 1800,
        minValue: null,
        maxValue: null,
      },
    ]);

    const payload = [
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 8,
        minValue: null,
        maxValue: null,
      },
      {
        metric: Metric.WEIGHT,
        mode: GoalMode.IN_RANGE,
        isActive: true,
        targetValue: null,
        minValue: 58,
        maxValue: 62,
      },
      {
        metric: Metric.WATER,
        mode: GoalMode.AT_LEAST,
        isActive: false,
        targetValue: 1800,
        minValue: null,
        maxValue: null,
      },
    ];

    const { PUT } = await import("@/app/api/goals/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/goals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(upsertGoalsByUserId).toHaveBeenCalledWith("user_1", payload);
    expect(data.goals).toHaveLength(3);
  });

  it("validates goal payloads", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { PUT } = await import("@/app/api/goals/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/goals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            metric: Metric.SLEEP,
            mode: GoalMode.AT_LEAST,
            isActive: true,
            targetValue: null,
            minValue: null,
            maxValue: null,
          },
          {
            metric: Metric.WEIGHT,
            mode: GoalMode.IN_RANGE,
            isActive: false,
            targetValue: null,
            minValue: null,
            maxValue: null,
          },
          {
            metric: Metric.WATER,
            mode: GoalMode.AT_LEAST,
            isActive: false,
            targetValue: null,
            minValue: null,
            maxValue: null,
          },
        ]),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("请填写目标值");
  });
});
