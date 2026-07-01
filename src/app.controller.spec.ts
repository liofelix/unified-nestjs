import { Test, TestingModule } from "@nestjs/testing";
import { IS_PUBLIC_KEY } from "./auth/decorators/public.decorator";
import { AppController } from "./app.controller";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("should return the project title", () => {
      expect(appController.getTitle()).toBe("Unified NestJS");
    });

    it("is marked as public", () => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, AppController.prototype.getTitle)).toBe(true);
    });
  });
});
