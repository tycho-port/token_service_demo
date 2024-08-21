/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserService } from './userService';
import { AxiosError } from 'axios';

jest.mock('../base/baseService', () => {
  return {
    Services: jest.fn().mockImplementation(() => ({
      http: {
        get: jest.fn()
      }
    }))
  };
});

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getUserState', () => {
    it('should get user state and cache it', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      (userService as any).getMe = jest.fn().mockResolvedValue(mockUser);

      const [res1, res2] = await Promise.all([
        userService.getUserState(),
        userService.getUserState()
      ]);

      expect(res1).toEqual(mockUser);
      expect(res2).toEqual(mockUser);
      expect((userService as any).getMe).toHaveBeenCalledTimes(1);
    });

    it('should reset userState after completion', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      (userService as any).getMe = jest.fn().mockResolvedValue(mockUser);

      await userService.getUserState();

      expect(UserService['userState']).toBeNull();
    });
  });

  describe('getMe', () => {
    it('should fetch user data successfully', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      // Mock the http property of the userService instance
      (UserService as any).http = {
        get: jest.fn(),
      };
      (UserService as any).http.get.mockResolvedValue({ data: mockUser });

      const result = await (userService as any).getMe();

      expect(result).toEqual(mockUser);
      expect((UserService as any).http.get).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle unauthorized error and call logout', async () => {
      const mockError = new AxiosError('Unauthorized');
      mockError.status = 401;
      // Mock the http property of the userService instance
      (UserService as any).http = {
        get: jest.fn(),
      };
      (UserService as any).http.get.mockRejectedValue(mockError);
      (UserService as any).logout = jest.fn().mockResolvedValue(undefined);

      await expect((userService as any).getMe()).rejects.toThrow();
      expect((UserService as any).logout).toHaveBeenCalled();
    });
  });
});