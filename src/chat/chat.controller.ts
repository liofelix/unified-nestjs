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
} from "@nestjs/common";
import { ApiBearerAuth, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { JwtAuthenticatedUser } from "../auth/auth.types";
import { ChatService } from "./chat.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";

type AuthenticatedRequest = Request & { user: JwtAuthenticatedUser };

@ApiTags("对话")
@ApiBearerAuth()
@Controller("chat/conversations")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  create(@Body() dto: CreateConversationDto, @Req() request: AuthenticatedRequest) {
    return this.chatService.create(request.user.id, dto);
  }

  @Get()
  findAll(@Query() query: ListConversationsDto, @Req() request: AuthenticatedRequest) {
    return this.chatService.findAll(request.user.id, query);
  }

  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.findOne(id, request.user.id);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateConversationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.update(id, request.user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.remove(id, request.user.id);
  }

  @Get(":id/messages")
  getMessages(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.getMessages(id, request.user.id);
  }

  @Sse(":id/messages/stream", { method: RequestMethod.POST })
  @ApiProduces("text/event-stream")
  streamMessage(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: SendMessageDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const abortController = new AbortController();
      let streamCompleted = false;
      const abort = () => {
        if (!response.writableEnded) {
          abortController.abort();
        }
      };
      response.once("close", abort);

      void (async () => {
        try {
          for await (const event of this.chatService.streamReply(
            id,
            request.user.id,
            dto,
            abortController.signal,
          )) {
            subscriber.next(event);
          }

          streamCompleted = true;
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();

      return () => {
        response.off("close", abort);
        if (!streamCompleted && !response.writableEnded && !abortController.signal.aborted) {
          abortController.abort();
        }
      };
    });
  }
}
