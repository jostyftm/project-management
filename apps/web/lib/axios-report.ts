import { REPORT_API_URL } from "@/config/enviroments";
import Axios from "axios";

const axiosReport = Axios.create({
  baseURL: REPORT_API_URL,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  withCredentials: false,
  withXSRFToken: false,
});

export { axiosReport };
