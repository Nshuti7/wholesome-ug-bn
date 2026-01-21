import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async getHealth() {
    return await this.appService.getHealth();
  }

  @Post('revalidate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger frontend revalidation (Admin only)' })
  async revalidate(
    @Body() body: { path?: string },
  ) {
    // This endpoint requires admin authentication (JWT)
    // The token validation is handled by the JWT guard
    // We get the revalidation token from environment variables
    const revalidateToken = this.configService.get<string>('REVALIDATE_TOKEN');
    
    if (!revalidateToken) {
      throw new UnauthorizedException('Revalidation token not configured');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_BASE_URL') || 
                       this.configService.get<string>('FRONTEND_URL') || 
                       'http://localhost:3000';

    try {
      // Call frontend revalidation endpoint with token
      const revalidateUrl = body.path 
        ? `${frontendUrl}/api/revalidate?path=${encodeURIComponent(body.path)}&token=${encodeURIComponent(revalidateToken)}`
        : `${frontendUrl}/api/revalidate?token=${encodeURIComponent(revalidateToken)}`;

      const response = await fetch(revalidateUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Frontend revalidation failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        message: body.path 
          ? `Revalidated path: ${body.path}`
          : 'Revalidated all paths',
        result,
      };
    } catch (error) {
      throw new Error(`Failed to trigger revalidation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
