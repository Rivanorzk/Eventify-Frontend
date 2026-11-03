import Cookies from "js-cookie";

const TOKEN_KEY = "token";

export const getToken = () => {
  return Cookies.get(TOKEN_KEY) || null;
};

export const setToken = (token) => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 1,
    sameSite: "lax",
  });
};

export const removeToken = () => {
  Cookies.remove(TOKEN_KEY);
};