/**
 * 普通 HTTP 响应的中文消息格式化工具。
 * 负责统一成功消息、校验消息和 NestJS 默认异常消息，避免英文默认文案直接返回给客户端。
 */
import { HttpStatus } from "@nestjs/common";
import type { ValidationError } from "class-validator";

/** 普通 HTTP 请求成功时返回的统一消息。 */
export const SUCCESS_MESSAGE = "操作成功";

/** 未捕获异常时返回给客户端的统一消息。 */
export const INTERNAL_SERVER_ERROR_MESSAGE = "服务器内部错误";

type ValidationMessageFormatter = (property: string, message: string) => string;

/** 常见 HTTP 状态码对应的中文兜底消息。 */
const DEFAULT_HTTP_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "请求参数错误",
  [HttpStatus.UNAUTHORIZED]: "未授权，请先登录",
  [HttpStatus.FORBIDDEN]: "没有权限执行此操作",
  [HttpStatus.NOT_FOUND]: "请求的资源不存在",
  [HttpStatus.METHOD_NOT_ALLOWED]: "不允许使用当前请求方法",
  [HttpStatus.REQUEST_TIMEOUT]: "请求超时",
  [HttpStatus.CONFLICT]: "请求与现有资源冲突",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "请求数据校验失败",
  [HttpStatus.TOO_MANY_REQUESTS]: "请求过于频繁，请稍后再试",
  [HttpStatus.INTERNAL_SERVER_ERROR]: INTERNAL_SERVER_ERROR_MESSAGE,
  [HttpStatus.BAD_GATEWAY]: "上游服务暂不可用",
  [HttpStatus.SERVICE_UNAVAILABLE]: "服务暂不可用",
  [HttpStatus.GATEWAY_TIMEOUT]: "上游服务响应超时",
};

/** NestJS 内置异常通常使用的英文默认消息。 */
const NEST_DEFAULT_MESSAGES: Record<string, string> = {
  "Bad Request": "请求参数错误",
  Unauthorized: "未授权，请先登录",
  Forbidden: "没有权限执行此操作",
  "Not Found": "请求的资源不存在",
  Conflict: "请求与现有资源冲突",
  "Method Not Allowed": "不允许使用当前请求方法",
  "Request Timeout": "请求超时",
  "Unprocessable Entity": "请求数据校验失败",
  "Too Many Requests": "请求过于频繁，请稍后再试",
  "Internal server error": INTERNAL_SERVER_ERROR_MESSAGE,
  "Internal Server Error": INTERNAL_SERVER_ERROR_MESSAGE,
  "Bad Gateway": "上游服务暂不可用",
  "Service Unavailable": "服务暂不可用",
  "Gateway Timeout": "上游服务响应超时",
};

/** class-validator 当前项目使用到的约束对应的中文消息格式化器。 */
const VALIDATION_MESSAGE_FORMATTERS: Record<string, ValidationMessageFormatter> = {
  isString: (property) => `${property} 必须是字符串`,
  isEmail: (property) => `${property} 必须是有效的邮箱地址`,
  isArray: (property) => `${property} 必须是数组`,
  isUuid: (property) => `${property} 必须是有效的 UUID`,
  isInt: (property) => `${property} 必须是整数`,
  isBoolean: (property) => `${property} 必须是布尔值`,
  isDefined: (property) => `${property} 不能为空`,
  isNotEmpty: (property) => `${property} 不能为空`,
  minLength: (property, message) => {
    const limit = extractNumber(message, /longer than or equal to (-?\d+(?:\.\d+)?) characters/i);
    return limit ? `${property} 长度不能少于 ${limit} 个字符` : `${property} 长度不符合要求`;
  },
  maxLength: (property, message) => {
    const limit = extractNumber(message, /shorter than or equal to (-?\d+(?:\.\d+)?) characters/i);
    return limit ? `${property} 长度不能超过 ${limit} 个字符` : `${property} 长度不符合要求`;
  },
  min: (property, message) => {
    const limit = extractNumber(message, /less than (-?\d+(?:\.\d+)?)/i);
    return limit ? `${property} 不能小于 ${limit}` : `${property} 数值不符合要求`;
  },
  max: (property, message) => {
    const limit = extractNumber(message, /greater than (-?\d+(?:\.\d+)?)/i);
    return limit ? `${property} 不能大于 ${limit}` : `${property} 数值不符合要求`;
  },
  whitelistValidation: (property) => `${property} 不允许传入`,
};

/** 将 ValidationPipe 产生的校验树转换为扁平中文消息列表。 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages = errors.flatMap((error) => formatValidationError(error));
  return messages.length > 0 ? messages : ["请求数据校验失败"];
}

/** 将普通 HTTP 异常中的字符串、字符串数组或未知值格式化为中文消息。 */
export function normalizeHttpMessage(message: unknown, statusCode: number): string {
  if (Array.isArray(message)) {
    const messages = message
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeSingleMessage(item, statusCode));

    return messages.length > 0 ? messages.join("；") : getDefaultHttpMessage(statusCode);
  }

  return normalizeSingleMessage(typeof message === "string" ? message : "", statusCode);
}

/** 递归格式化单个校验节点及其子节点。 */
function formatValidationError(error: ValidationError, parentPath = ""): string[] {
  const property = error.property
    ? [parentPath, error.property].filter(Boolean).join(".")
    : parentPath;
  const messages = Object.entries(error.constraints ?? {}).map(([constraint, message]) =>
    formatValidationConstraint(constraint, property, message),
  );
  const childMessages = (error.children ?? []).flatMap((child) =>
    formatValidationError(child, property),
  );

  return [...messages, ...childMessages];
}

/** 根据 class-validator 约束名称生成单条中文校验消息。 */
function formatValidationConstraint(constraint: string, property: string, message: string): string {
  if (containsChinese(message)) {
    return message;
  }

  const propertyName = property || "请求数据";
  const formatter = VALIDATION_MESSAGE_FORMATTERS[constraint];
  return formatter ? formatter(propertyName, message) : `${propertyName} 校验失败`;
}

/** 将 NestJS 默认消息和未知英文消息统一转换为中文。 */
function normalizeSingleMessage(message: string, statusCode: number): string {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return getDefaultHttpMessage(statusCode);
  }

  const standardMessage = NEST_DEFAULT_MESSAGES[trimmedMessage];
  if (standardMessage) {
    return standardMessage;
  }

  if (/^Cannot (?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+.+/i.test(trimmedMessage)) {
    return "请求的接口不存在";
  }

  const uuidVersion = trimmedMessage.match(/^Validation failed \(uuid v ?([3457]) is expected\)$/i);
  if (uuidVersion) {
    return `参数必须是有效的 UUID v${uuidVersion[1]}`;
  }

  if (/^Validation failed \(uuid is expected\)$/i.test(trimmedMessage)) {
    return "参数必须是有效的 UUID";
  }

  if (/^The value passed as UUID is not a string$/i.test(trimmedMessage)) {
    return "UUID 参数必须是字符串";
  }

  return containsChinese(trimmedMessage) ? trimmedMessage : getDefaultHttpMessage(statusCode);
}

/** 判断消息是否包含至少一个中文字符。 */
function containsChinese(message: string): boolean {
  return /[\u3400-\u9fff]/u.test(message);
}

/** 从 class-validator 默认英文消息中提取限制值。 */
function extractNumber(message: string, pattern: RegExp): string | undefined {
  return message.match(pattern)?.[1];
}

/** 获取指定状态码的中文兜底消息。 */
function getDefaultHttpMessage(statusCode: number): string {
  return DEFAULT_HTTP_MESSAGES[statusCode] ?? "请求处理失败";
}
