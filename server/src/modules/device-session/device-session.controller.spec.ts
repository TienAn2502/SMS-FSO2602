import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSessionController } from './device-session.controller';
import { DeviceSessionService } from './device-session.service';

describe('DeviceSessionController', () => {
  let controller: DeviceSessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceSessionController],
      providers: [DeviceSessionService],
    }).compile();

    controller = module.get<DeviceSessionController>(DeviceSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
