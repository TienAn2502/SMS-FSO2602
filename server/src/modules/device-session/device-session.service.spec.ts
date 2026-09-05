import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSessionService } from './device-session.service';

describe('DeviceSessionService', () => {
  let service: DeviceSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceSessionService],
    }).compile();

    service = module.get<DeviceSessionService>(DeviceSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
