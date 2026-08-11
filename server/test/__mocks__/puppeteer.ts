const mockBrowser = {
  close: jest.fn().mockResolvedValue(undefined),
  newPage: jest.fn(),
};

export const launch = jest.fn().mockResolvedValue(mockBrowser);

export default {
  launch,
};
