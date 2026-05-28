import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AssetController } from './infrastructure/http/controllers/asset.controller'
import { AssetTypeOrmEntity } from './infrastructure/entities/asset-typeorm.entity'
import { AssetDepreciationTypeOrmEntity } from './infrastructure/entities/asset-depreciation-typeorm.entity'
import { ASSET_REPOSITORY } from './domain/repositories/asset-repository.port'
import { AssetTypeOrmRepository } from './infrastructure/repositories/asset-typeorm.repository'
import { ASSET_SERVICE } from './application/ports/asset-service.port'
import { AssetService } from './application/services/asset.service'
import { FinanceModule } from '../finance/finance.module'

@Module({
  imports: [
    FinanceModule,
    TypeOrmModule.forFeature([
      AssetTypeOrmEntity,
      AssetDepreciationTypeOrmEntity,
    ]),
  ],
  controllers: [AssetController],
  providers: [
    { provide: ASSET_REPOSITORY, useClass: AssetTypeOrmRepository },
    { provide: ASSET_SERVICE, useClass: AssetService },
  ],
  exports: [ASSET_SERVICE],
})
export class AssetModule {}
