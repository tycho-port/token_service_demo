/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from 'axios';
import { HttpStatusCode } from 'axios';
import { Services } from './baseService';

describe('handleResponseInterception', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Services['isLoggedIn'] = false;
    Services['_authorizing'] = null;
    Services['refreshToken'] = 'some_token';
  });

  it('should handle unauthorized error and refresh token', async () => {
    const mockError = {
      response: { status: HttpStatusCode.Unauthorized },
      config: { url: 'some-url', headers: { Authorization: 'old-token' } },
    } as AxiosError;

    const useRefreshTokenSpy = jest.spyOn(Services as any, 'useRefreshToken').mockResolvedValue(true);
    const changeIsLoggedInSpy = jest.spyOn(Services as any, 'changeIsLoggedIn');
    const httpRequestSpy = jest.spyOn((Services as any).http, 'request').mockResolvedValue({});
    
    const res = await Services['handleResponseInterception'](mockError);

    expect(res).toStrictEqual({});
    expect(useRefreshTokenSpy).toHaveBeenCalled();
    expect(changeIsLoggedInSpy).toHaveBeenCalledWith(true);
    expect(httpRequestSpy).toHaveBeenCalled();
  });

  it('should handle unauthorized error and logout if refresh token is invalid', async () => {
    const mockError = {
      response: { status: HttpStatusCode.Unauthorized },
      config: { url: 'some-url', headers: { Authorization: 'old-token' } },
    } as AxiosError;

    const useRefreshTokenSpy = jest.spyOn(Services as any, 'useRefreshToken').mockResolvedValue(false);
    const logoutSpy = jest.spyOn(Services as any, 'logout').mockResolvedValue(undefined);

    await expect(Services['handleResponseInterception'](mockError)).rejects.toThrow('user is not logged in');
    
    expect(useRefreshTokenSpy).toHaveBeenCalled();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should not refresh token for logout request', async () => {
    const mockError = {
      response: { status: HttpStatusCode.Unauthorized, config: { url: 'auth/logout' } },
    } as AxiosError;

    const useRefreshTokenSpy = jest.spyOn(Services as any, 'useRefreshToken');

    await expect(Services['handleResponseInterception'](mockError)).rejects.toEqual(mockError);

    expect(useRefreshTokenSpy).not.toHaveBeenCalled();
  });

  it('should not refresh token for refresh request', async () => {
    const mockError = {
      response: { status: HttpStatusCode.Unauthorized, config: { url: 'auth/refresh' } },
    } as AxiosError;

    const useRefreshTokenSpy = jest.spyOn((Services as any), 'useRefreshToken');

    await expect(Services['handleResponseInterception'](mockError)).rejects.toEqual(mockError);

    expect(useRefreshTokenSpy).not.toHaveBeenCalled();
  });

  it('should handle error without response', async () => {
    const mockError = { request: {} } as AxiosError;

    await expect(Services['handleResponseInterception'](mockError)).rejects.toEqual(mockError);
  });

  it('should handle error without response and request', async () => {
    const mockError = {} as AxiosError;

    await expect(Services['handleResponseInterception'](mockError)).rejects.toEqual(mockError);
  });
});