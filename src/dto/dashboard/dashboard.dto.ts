import type { DashboardOverviewResponse } from "@/types/dashboard";

export type DashboardOverviewDto = DashboardOverviewResponse;

export function toDashboardOverviewDto(
  data: DashboardOverviewResponse,
): DashboardOverviewDto {
  return data;
}
