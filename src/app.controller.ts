/**
 * 应用根路由控制器。
 * 提供无需鉴权的服务标题接口，用于确认应用已正常启动。
 */
import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/decorators/public.decorator";

/** 处理应用根路径请求的控制器。 */
@Controller()
export class AppController {
  /** 返回应用展示名称。 */
  @Get()
  @Public()
  getTitle(): string {
    return "Unified NestJS";
  }
}
