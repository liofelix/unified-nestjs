import { Test, TestingModule } from "@nestjs/testing";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("is not marked as public", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, UsersController)).toBeUndefined();
  });
});
