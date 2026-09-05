import { z } from 'zod';

export const CreateDeviceSessionSchema = z.object({
  os: z.string().min(1),
  browser: z.string().min(1),
  deviceId: z.string().min(1),
  deviceType: z.string().min(1).optional(),
  ipAddress: z.string().min(1),
  deviceModel: z.string().min(1).optional(),
  deviceVendor: z.string().min(1).optional(),
  userId: z.uuid(),
});

export const deleteManyDevicesSchema = z.object({
  // Nhận vào là một mảng chuỗi từ client, sau đó transform thành Set<string>
  sessionIdKeys: z
    .array(z.string(), {
      message: 'Danh sách khóa sessionId không được để trống',
    })
    .min(1, 'Phải có ít nhất một thiết bị để xóa'),
});

export type DeleteManyDevicesInput = z.infer<typeof deleteManyDevicesSchema>;

export type CreateDeviceSessionInput = z.infer<
  typeof CreateDeviceSessionSchema
>;
