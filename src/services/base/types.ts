export enum AUTHREQUEST {
  LOGIN = 'auth/login',
  REFRESH = 'auth/refresh',
  LOGOUT = 'auth/logout',
  HEADERNAME = 'Authorization',
}

export interface LoginCB {
  access_jwt: string;
  refresh_jwt: string;
}