import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;
  let guard: JwtAuthGuard;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  it("allows public routes without passport jwt validation", () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const passportCanActivate = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      "canActivate",
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(passportCanActivate).not.toHaveBeenCalled();

    passportCanActivate.mockRestore();
  });

  it("uses passport jwt validation for non-public routes", () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const passportCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), "canActivate")
      .mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(passportCanActivate).toHaveBeenCalledWith(context);

    passportCanActivate.mockRestore();
  });
});
