import { HttpStatusCode } from 'axios';
import { Services } from '../base/baseService';
import { User, USERREQUESTS } from './types';
import { AxiosError } from 'axios';

export class UserService extends Services {
  protected static userState: Promise<void> | null = null;

  public constructor() {
    super();
  }

  /**
   * Delay the original request until request has been completed
   * then send the user information to all listeners.
   * @returns user
   */
  public readonly getUserState = async () => {
    UserService.userState ??= this.getMe()
      .then(r => {
        UserService.user = r;
      })
      .finally(() => UserService.userState = null);

    await UserService.userState;
    return UserService.user;
  };

  /**
   * get user information
   */
  private readonly getMe = async () => {
    try {
      const { data } = await UserService.http.get<User>(USERREQUESTS.ME);
      return data;
    } catch (e) {
      if (e instanceof AxiosError && e.status === HttpStatusCode.Unauthorized) await UserService.logout();
      throw e;
    }
  };
}