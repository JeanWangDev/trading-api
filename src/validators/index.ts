/**
 * 请求参数校验聚合导出（Zod）
 * - common/parse：validateBody、formatZodError 等通用工具
 * - auth/：注册、登录等 body
 * - market/：行情 query
 */
export {
  formatZodError,
  validateBody,
  validateQuery,
  zodToFieldIssues,
  type ValidationIssue,
} from "./common/parse";

export {
  registerBodySchema,
  loginBodySchema,
  sendEmailCodeBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  updateProfileBodySchema,
  type RegisterBody,
  type LoginBody,
  type SendEmailCodeBody,
  type ForgotPasswordBody,
  type ResetPasswordBody,
  type UpdateProfileBody,
} from "./auth";

export {
  klinesQuerySchema,
  searchSymbolsQuerySchema,
  symbolInfoQuerySchema,
  type KlinesQuery,
  type SearchSymbolsQuery,
  type SymbolInfoQuery,
} from "./market";

export {
  createBillingOrderBodySchema,
  billingOrderNoParamSchema,
  type CreateBillingOrderBody,
} from "./billing";

export {
  chainOrderIdParamSchema,
  chainOrderStatusSchema,
  listChainOrdersQuerySchema,
  upsertChainOrderBodySchema,
  type ListChainOrdersQuery,
  type UpsertChainOrderBody,
} from "./chain-order";
