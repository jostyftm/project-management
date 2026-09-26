// import { WEB_URL } from "@/config/enviroments";
import { WEB_URL } from "@/config/enviroments";
import Axios from "axios";

const axiosApi = Axios.create({
  baseURL: WEB_URL,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  withCredentials: false,
  withXSRFToken: false,
});

export { axiosApi };
