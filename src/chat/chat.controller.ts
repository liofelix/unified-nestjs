/**
 * 聊天 HTTP/SSE 控制器。
 * 处理会话 CRUD、消息查询和流式回复，并从认证请求中读取当前用户 ID。
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  RequestMethod,
  Res,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiProduces, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import type { JwtAuthenticatedUser } from "../auth/auth.types";
import { ChatService } from "./chat.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";

/** 已通过 JWT 守卫并携带认证用户上下文的 Express 请求类型。 */
type AuthenticatedRequest = Request & { user: JwtAuthenticatedUser };

@ApiTags("对话")
@ApiBearerAuth()
/** 将聊天请求委托给 ChatService 的控制器。 */
@Controller("chat/conversations")
export class ChatController {
  /** 注入会话服务。 */
  constructor(private readonly chatService: ChatService) {}

  /** 创建当前用户的新会话。 */
  @Post()
  create(@Body() dto: CreateConversationDto, @Req() request: AuthenticatedRequest) {
    return this.chatService.create(request.user.id, dto);
  }

  /** 按分页和筛选条件返回当前用户的会话列表。 */
  @Get()
  findAll(@Query() query: ListConversationsDto, @Req() request: AuthenticatedRequest) {
    return this.chatService.findAll(request.user.id, query);
  }

  /** 返回当前用户可访问的单个会话。 */
  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.findOne(id, request.user.id);
  }

  /** 更新会话标题或项目空间关联。 */
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateConversationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.update(id, request.user.id, dto);
  }

  /** 对会话执行软删除，同时由服务级联标记消息。 */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.remove(id, request.user.id);
  }

  /** 返回会话中未删除的消息时间线。 */
  @Get(":id/messages")
  getMessages(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.getMessages(id, request.user.id);
  }

  /**
   * 以 SSE 流式返回 Agent 回复。
   * 客户端断开连接时通过 AbortController 取消 Agent 和后续持久化流程。
   */
  @Sse(":id/messages/stream", { method: RequestMethod.POST })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiProduces("text/event-stream")
  streamMessage(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: SendMessageDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const abortController = new AbortController();
      let isStreamCompleted = false;
      // 仅在响应尚未正常结束时中止底层 Agent 请求。
      const abort = () => {
        if (!response.writableEnded) {
          abortController.abort();
        }
      };
      response.once("close", abort);

      void (async () => {
        try {
          // 逐个转发服务层事件，保持 SSE 增量输出顺序。
          for await (const event of this.chatService.streamReply(
            id,
            request.user.id,
            dto,
            abortController.signal,
          )) {
            subscriber.next(event);
          }

          isStreamCompleted = true;
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();

      return () => {
        response.off("close", abort);
        if (!isStreamCompleted && !response.writableEnded && !abortController.signal.aborted) {
          abortController.abort();
        }
      };
    });
  }
}
