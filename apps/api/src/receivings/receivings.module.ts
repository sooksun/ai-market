import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { AssetsModule } from '../assets/assets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReceivingsService } from './receivings.service';
import { ReceivingsController } from './receivings.controller';

@Module({
  imports: [InventoryModule, AssetsModule, NotificationsModule],
  controllers: [ReceivingsController],
  providers: [ReceivingsService],
  exports: [ReceivingsService],
})
export class ReceivingsModule {}
