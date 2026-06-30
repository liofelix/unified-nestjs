import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getTitle(): string {
    return "Unified NestJS";
  }
}
