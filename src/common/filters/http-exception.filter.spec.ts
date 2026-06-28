import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: {
    json: jest.Mock;
    status: jest.Mock;
  };
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    host = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(response),
      }),
    } as unknown as ArgumentsHost;
  });

  it('wraps HttpException responses', () => {
    filter.catch(new HttpException('未授权', HttpStatus.UNAUTHORIZED), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(response.json).toHaveBeenCalledWith({
      code: HttpStatus.UNAUTHORIZED,
      data: null,
      msg: '未授权',
    });
  });

  it('joins validation messages from BadRequestException', () => {
    filter.catch(
      new BadRequestException({
        message: ['username must be longer than or equal to 3 characters'],
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      data: null,
      msg: 'username must be longer than or equal to 3 characters',
    });
  });

  it('wraps unknown errors as internal server errors', () => {
    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: null,
      msg: 'Internal server error',
    });
  });
});
