import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AgentsRegistry } from "./agents.registry";

@ApiTags("Agent")
@ApiBearerAuth()
@Controller("agents")
export class AgentsController {
  constructor(private readonly agentsRegistry: AgentsRegistry) {}

  @Get()
  list() {
    return this.agentsRegistry.list();
  }
}
