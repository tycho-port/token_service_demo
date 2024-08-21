import axios, { AxiosError, HttpStatusCode } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { AUTHREQUEST, LoginCB } from './types';
import { setBearer } from './helper';
import { User } from '../userService/types';

/**
 * Base clase for each service
 */
export abstract class Services {
  private static accessToken: string | null;
  private static refreshToken: string | null;
  private static isLoggedIn = false;
  private static _authorizing: Promise<void> | null = null;
  protected static user: User | undefined;

  /**
   * Shared Axios instance between the services.
   */
  protected static http = axios.create({
    baseURL: ''
  });

  private static readonly handleResponseInterception = async (error: AxiosError) => {
    const {config, response, request} = error;
    if (response) {
      // try and get new tokens, else relog.
      // logout shouldnt be refreshed. if failed tokens will be deleted
      if (
        response.status === HttpStatusCode.Unauthorized &&
        (error.response?.config?.url || config?.url) !== AUTHREQUEST.REFRESH &&
        (config?.url || error.response?.config?.url) !== AUTHREQUEST.LOGOUT
      ) {
        // If _authorizing is null or undefined,
        // call useRefreshToken() and assign the resulting Promise to _authorizing
        // This will ensure other responses will only continue after useRefreshToken is resolved.
        this._authorizing ??= this.useRefreshToken()
          .then(async r => {
            // If the refresh token is valid, set isLoggedIn to true
            if (r) this.changeIsLoggedIn(true);
            // If the refresh token is invalid, log out
            else await this.logout();
          })
          .catch(async e => {
            // If an error occurs, reject the promise with the error
            await Promise.reject(e);
          })
          .finally(() => {
            // Regardless of the outcome, set _authorizing to null when the promise is settled
            this._authorizing = null;
          });

        // Remove the old authorization header from the config
        delete config?.headers[AUTHREQUEST.HEADERNAME];

        // Delay the original request until authorization has been completed
        return await this._authorizing.then(async () => {
          // If the user is logged in, make the original request
          if (this.isLoggedIn && config) return await this.http.request(config);
          // If the user is not logged in, reject the promise with an error
          return await Promise.reject(new Error('user is not logged in'));
        });
      }

      // create default error responses here.
    } else if (request) {
      // Succesful request but no response received.
    } else {
      // Something went wrong during setup.
    }

    return await Promise.reject(error); // Propagate the error further
  };

  /**
   * Handles refreshToken queue
   */
  static {
    this.http.interceptors.response.use(
      undefined,
      this.handleResponseInterception
    );
  }

  protected constructor() {}

  /**
   * Remove Tokens from secure storage and memory
   */
  private static readonly resetAuth = async () => {
    // remove tokens from memory.
    this.accessToken = null;
    this.refreshToken = null;
    // implement removal of tokens from secure storage here.
  };

  /**
   * Changes the login state of the user
   *
   * @param b - A boolean value indicating whether the user is logged in (true) or not (false).
   */
  protected static readonly changeIsLoggedIn = (b: boolean) => {
    if (b !== this.isLoggedIn) this.isLoggedIn = b;
    // emit event to notify listeners here
  };

  /**
   * Logout and optionally send logout signal to server.
   * @param unforced - optional boolean which checks if the logout was forced or not.
   */
  protected static readonly logout = async (unforced = false) => {
    // do request
    if (unforced) {
      // in this case there needs to be a request to the API to logout
      // otherwise you are already logged out in the API.
      try {
        await this.http.post(AUTHREQUEST.LOGOUT);
      } catch (e) {
        if (
          e instanceof AxiosError &&
          (e.status || e.response?.status) !== HttpStatusCode.Unauthorized
        ) {
          throw new Error('Something went wrong, please try again later');
        }
      }
    }
    // Remove tokens.
    await this.resetAuth();
    this.changeIsLoggedIn(false);
    this.user = undefined;
  };

  /**
   * Get the accesstoken from memory or storage.
   * @returns Token or void
   */
  private static readonly getAccessToken = async (): Promise<string | void> => {
    if (this.accessToken) return this.accessToken;
    // create implemenation to get token from storage according to your platform.

    throw new Error('No access token.');
  };

  /**
   * Get the refreshtoken from memory or storage.
   * @param refreshToken - Token or error
   */
  private static readonly getRefreshToken = async () => {
    if (this.refreshToken) return this.refreshToken;
    // create implemenation to get token from storage according to your platform.

    throw new Error('No refresh token');
  };

  /**
   * retrieves the accessToken and the refreshToken
   * And sets accessToken as the Auth Bearer Token as default for Axios
   * @param {{ refresh }} tokens
   */
  private static readonly sendRefreshToken = async ({refresh}: {refresh: string}) => {
    const {data} = await this.http.post<LoginCB>(
      AUTHREQUEST.REFRESH,
      {},
      {
        headers: {
          Authorization: setBearer(refresh)
        }
      }
    );
    return data;
  };

  /**
   * Stores the accessToken and the refreshToken
   * And sets accessToken as the Auth Bearer Token as default for Axios
   * @param {refresh_jwt, access_jwt} type
   */
  protected static readonly storeApiTokens = async ({refresh_jwt, access_jwt}: LoginCB) => {
    // implement secure storage here

    // Set tokens in memory and set default header
    this.accessToken = access_jwt;
    this.refreshToken = refresh_jwt;
    this.http.defaults.headers.common[AUTHREQUEST.HEADERNAME] = setBearer(access_jwt);
  };

  /**
   * Uses the refresh token to obtain a new access token
   * @returns true if the refresh token was used successfully, false otherwise
   */
  private static readonly useRefreshToken = async () => {
    try {
      // Get the refresh token from storage
      const refresh = await this.getRefreshToken();

      // If we have a refresh token
      if (refresh) {
        // Send the refresh token to the server to get a new access token
        const {access_jwt, refresh_jwt} = await this.sendRefreshToken({refresh});

        // Reset the authentication state
        await this.resetAuth();

        // Store the new access token and refresh token
        await this.storeApiTokens({refresh_jwt, access_jwt});

        // Return true to indicate success
        return true;
      }

      // If we don't have a refresh token, return false
      return false;
    } catch (e) {
      // Catch any errors that occur during the refresh token process
      throw new Error('Failed to use refresh token');
    }
  };

  /**
   * Checks if the user is authenticated asynchronously
   * @returns true if authenticated, false otherwise
   */
  protected static readonly isAuthenticatedAsync = async () => {
    try {
      // Try to get the access token
      await this.getAccessToken();

      // If we have an access token
      if (this.accessToken) {
        // Decode the JWT token to get the expiration time
        const { exp } = jwtDecode(this.accessToken);

        // If the token is not expired
        if (exp && exp > Date.now() / 1000) {
          // Set the logged in state to true
          this.changeIsLoggedIn(true);
          return true;
        }

        // If the token is expired, try to refresh it
        const auth = await this.useRefreshToken();
        this.changeIsLoggedIn(auth);
        return auth;
      }

      // If we don't have an access token, return false
      return false;
    } catch (e) {
      // If we catch an AxiosError with a 401 status code, log out the user
      if (
        e instanceof AxiosError &&
        (e.status || e.response?.status) === HttpStatusCode.Unauthorized
      ) {
        await this.logout();
      }

      // Return false to indicate authentication failed
      return false;
    }
  };

  /**
   * Checks if the user is authenticated synchronously
   * @returns true if authenticated, false otherwise
   */
  public static readonly isAuthenticated = () => this.isLoggedIn;

  protected static get isAuth() {
    return this.isLoggedIn;
  }

  static {
    this.isAuthenticatedAsync();
  }
}
