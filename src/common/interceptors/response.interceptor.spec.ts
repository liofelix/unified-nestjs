import { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { ResponseInterceptor } from "./response.interceptor";

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<unknown>;
  let context: ExecutionContext;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    context = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
  });

  it("wraps successful responses", async () => {
    const next = {
      handle: jest.fn().mockReturnValue(of({ id: "user-id" })),
    } as unknown as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
      code: 200,
      data: { id: "user-id" },
      msg: "success",
    });
  });

  it("converts undefined data to null", async () => {
    const next = {
      handle: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
      code: 200,
      data: null,
      msg: "success",
    });
  });
});
