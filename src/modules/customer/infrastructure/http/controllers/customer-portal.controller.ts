import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { CustomerPortalService } from '../../../application/services/customer-portal.service';
import {
  CustomerRegisterDto,
  CustomerLoginDto,
  UpdatePortalProfileDto,
  CreatePortalTestingRequestDto,
  UpdatePortalTestingRequestDto,
  UploadPortalDocumentDto,
} from '../dtos/customer-portal.dto';

@Controller('portal')
export class CustomerPortalController {
  constructor(private readonly portalService: CustomerPortalService) {}

  // ---- Auth -------------------------------------------------------

  @Post('register')
  async register(@Body() dto: CustomerRegisterDto) {
    return this.portalService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: CustomerLoginDto) {
    return this.portalService.login(dto.email, dto.password);
  }

  // ---- Profile ----------------------------------------------------

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.portalService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() dto: UpdatePortalProfileDto) {
    return this.portalService.updateProfile(req.user.id, dto);
  }

  // ---- Lab testing requests ---------------------------------------

  @Get('lab/testing-services')
  @UseGuards(JwtAuthGuard)
  async getTestingServices() {
    return this.portalService.getTestingServices();
  }

  @Post('lab/testing-requests')
  @UseGuards(JwtAuthGuard)
  async submitTestingRequest(
    @Req() req: any,
    @Body() dto: CreatePortalTestingRequestDto,
  ) {
    return this.portalService.submitTestingRequest(req.user.id, dto);
  }

  @Get('lab/testing-requests')
  @UseGuards(JwtAuthGuard)
  async getMyTestingRequests(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.portalService.getMyTestingRequests(req.user.id, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('lab/testing-requests/:id')
  @UseGuards(JwtAuthGuard)
  async getMyTestingRequest(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getMyTestingRequest(req.user.id, id);
  }

  @Patch('lab/testing-requests/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTestingRequest(@Req() req: any, @Param('id') id: string) {
    return this.portalService.cancelTestingRequest(req.user.id, id);
  }

  @Patch('lab/testing-requests/:id')
  @UseGuards(JwtAuthGuard)
  async updateTestingRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePortalTestingRequestDto,
  ) {
    return this.portalService.updateTestingRequest(req.user.id, id, dto);
  }

  @Get('lab/testing-requests/:id/track')
  @UseGuards(JwtAuthGuard)
  async trackRequest(@Req() req: any, @Param('id') id: string) {
    return this.portalService.trackRequest(req.user.id, id);
  }

  @Get('lab/testing-requests/:id/test-results')
  @UseGuards(JwtAuthGuard)
  async getMyTestResults(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getMyTestResults(req.user.id, id);
  }

  @Get('lab/test-results/:id')
  @UseGuards(JwtAuthGuard)
  async getMyTestResult(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getMyTestResult(req.user.id, id);
  }

  @Get('lab/testing-requests/:id/reports')
  @UseGuards(JwtAuthGuard)
  async getMyReports(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getMyReports(req.user.id, id);
  }

  @Get('lab/contracts')
  @UseGuards(JwtAuthGuard)
  async getMyContracts(@Req() req: any) {
    return this.portalService.getMyContracts(req.user.id);
  }

  @Get('lab/contracts/:id')
  @UseGuards(JwtAuthGuard)
  async getMyContract(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getMyContract(req.user.id, id);
  }

  @Get('lab/purchase-orders')
  @UseGuards(JwtAuthGuard)
  async getMyPurchaseOrders(@Req() req: any) {
    return this.portalService.getMyPurchaseOrders(req.user.id);
  }

  @Get('lab/purchase-orders/:id/document')
  @UseGuards(JwtAuthGuard)
  async getLabPODocument(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getLabPODocumentUrl(req.user.id, id);
  }

  @Get('lab/purchase-orders/:id')
  @UseGuards(JwtAuthGuard)
  async getMyPurchaseOrder(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getMyPurchaseOrder(req.user.id, id);
  }

  @Patch('lab/testing-requests/:id/upload-signed')
  @UseGuards(JwtAuthGuard)
  async uploadSignedDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UploadPortalDocumentDto,
  ) {
    return this.portalService.uploadSignedDocument(
      req.user.id,
      id,
      dto.fileUrl,
      dto.fileName,
    );
  }

  @Patch('lab/testing-requests/:id/upload-payment-proof')
  @UseGuards(JwtAuthGuard)
  async uploadPaymentProof(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UploadPortalDocumentDto,
  ) {
    return this.portalService.uploadPaymentProof(
      req.user.id,
      id,
      dto.fileUrl,
      dto.fileName,
    );
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboard(@Req() req: any) {
    return this.portalService.getDashboard(req.user.id);
  }
}
