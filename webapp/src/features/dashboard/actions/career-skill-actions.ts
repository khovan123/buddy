"use server"

import { PaginatedResult } from "@/types/api"

import { getCareers, getSkills } from "../services/dashboard.service"
import { CareerItem, SkillItem } from "../types"

export async function loadMoreCareersAction(
  page: number,
  limit = 20
): Promise<PaginatedResult<CareerItem> | null> {
  return getCareers(page, limit)
}

export async function loadMoreSkillsAction(
  page: number,
  limit = 20
): Promise<PaginatedResult<SkillItem> | null> {
  return getSkills(page, limit)
}
