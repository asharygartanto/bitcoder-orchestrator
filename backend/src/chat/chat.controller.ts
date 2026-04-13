import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { CreateSessionDto, SendMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('sessions')
  async createSession(@Req() req: Request, @Body() dto: CreateSessionDto) {
    return this.chatService.createSession(
      req.user!.organizationId,
      req.user!.id,
      dto,
    );
  }

  @Get('sessions')
  async getSessions(@Req() req: Request) {
    return this.chatService.findSessions(
      req.user!.organizationId,
      req.user!.id,
    );
  }

  @Get('sessions/:sessionId')
  async getSession(@Req() req: Request, @Param('sessionId') sessionId: string) {
    return this.chatService.findSession(
      req.user!.organizationId,
      sessionId,
      req.user!.id,
    );
  }

  @Delete('sessions/:sessionId')
  async deleteSession(@Req() req: Request, @Param('sessionId') sessionId: string) {
    return this.chatService.deleteSession(
      req.user!.organizationId,
      sessionId,
      req.user!.id,
    );
  }

  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      req.user!.organizationId,
      sessionId,
      req.user!.id,
      dto,
    );
  }

  @Post('sessions/:sessionId/messages/stream')
  async sendMessageStream(
    @Req() req: Request,
    @Res() res: Response,
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessageStream(
      req.user!.organizationId,
      sessionId,
      req.user!.id,
      dto.content,
      res,
    );
  }
}
