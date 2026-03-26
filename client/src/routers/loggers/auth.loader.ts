import { getAccessToken } from "../../api/api";

export const authLoader = async () => {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  return { authenticated: true };
};
